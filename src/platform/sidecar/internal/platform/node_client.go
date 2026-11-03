package platform

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"sync"
	"time"
)

const (
	StatusCacheTTL      = 2 * time.Second
	ipcRequestTimeout   = 5 * time.Second
	sidecarSecretHeader = "x-kbn-sidecar-secret"
)

type StatusBlob struct {
	Config      StatusConfig           `json:"config"`
	CoreOverall StatusLevel            `json:"coreOverall"`
	Overall     StatusLevel            `json:"overall"`
	Core        map[string]StatusLevel `json:"core"`
	Plugins     map[string]StatusLevel `json:"plugins"`
	Metrics     json.RawMessage        `json:"metrics"`
}

type StatusConfig struct {
	AllowAnonymous                   bool        `json:"allowAnonymous"`
	StatusPageBypassMonitorPrivilege bool        `json:"statusPageBypassMonitorPrivilege"`
	ServerName                       string      `json:"serverName"`
	UUID                             string      `json:"uuid"`
	PackageInfo PackageInfo           `json:"packageInfo"`
}

type PackageInfo struct {
	Version     string `json:"version"`
	BuildSha    string `json:"buildSha"`
	BuildNum    int    `json:"buildNum"`
	BuildDate   string `json:"buildDate"`
	BuildFlavor string `json:"buildFlavor"`
}

type StatusLevel struct {
	Level   string `json:"level"`
	Summary string `json:"summary"`
}

type AuthResult struct {
	IsAuthenticated bool              `json:"isAuthenticated"`
	ESHeaders       map[string]string `json:"esHeaders,omitempty"`
}

type PrivilegeResult struct {
	HasAllRequested bool `json:"has_all_requested"`
}

type NodeClient struct {
	client *http.Client
	secret string

	cacheMu  sync.RWMutex
	cached   *StatusBlob
	cachedAt time.Time
}

func NewNodeClient(socketPath, secret string) *NodeClient {
	transport := &http.Transport{
		DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
			return (&net.Dialer{}).DialContext(ctx, "unix", socketPath)
		},
		MaxIdleConnsPerHost: 10,
		IdleConnTimeout:     90 * time.Second,
	}
	return &NodeClient{
		client: &http.Client{
			Transport: transport,
			Timeout:   ipcRequestTimeout,
		},
		secret: secret,
	}
}

func (c *NodeClient) GetStatus(ctx context.Context) (*StatusBlob, error) {
	c.cacheMu.RLock()
	if c.cached != nil && time.Since(c.cachedAt) < StatusCacheTTL {
		blob := c.cached
		c.cacheMu.RUnlock()
		return blob, nil
	}
	c.cacheMu.RUnlock()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://kibana-node/internal/sidecar/status", nil)
	if err != nil {
		return nil, err
	}
	c.setSidecarHeaders(req)

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("status IPC returned %d", resp.StatusCode)
	}

	var blob StatusBlob
	if err := json.NewDecoder(resp.Body).Decode(&blob); err != nil {
		return nil, fmt.Errorf("decoding status response: %w", err)
	}

	c.cacheMu.Lock()
	c.cached = &blob
	c.cachedAt = time.Now()
	c.cacheMu.Unlock()

	return &blob, nil
}

func (c *NodeClient) Authenticate(ctx context.Context, originalReq *http.Request) (*AuthResult, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "http://kibana-node/internal/sidecar/authenticate", nil)
	if err != nil {
		return nil, err
	}
	c.setSidecarHeaders(req)

	for _, name := range []string{"cookie", "authorization"} {
		if values := originalReq.Header.Values(name); len(values) > 0 {
			for _, v := range values {
				req.Header.Add(name, v)
			}
		}
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("authenticate IPC returned %d", resp.StatusCode)
	}

	var result AuthResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decoding auth response: %w", err)
	}

	return &result, nil
}

func (c *NodeClient) CheckPrivileges(ctx context.Context, esHeaders map[string]string, cluster []string) (*PrivilegeResult, error) {
	body := struct {
		ESHeaders  map[string]string `json:"esHeaders"`
		Privileges struct {
			Cluster []string `json:"cluster"`
		} `json:"privileges"`
	}{
		ESHeaders: esHeaders,
	}
	body.Privileges.Cluster = cluster

	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "http://kibana-node/internal/sidecar/check_privileges", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	c.setSidecarHeaders(req)
	req.Header.Set("content-type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("check_privileges IPC returned %d", resp.StatusCode)
	}

	var result PrivilegeResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decoding privileges response: %w", err)
	}

	return &result, nil
}

func (c *NodeClient) setSidecarHeaders(req *http.Request) {
	req.Header.Set(sidecarSecretHeader, c.secret)
	req.Header.Set("kbn-xsrf", "true")
	req.Header.Set("x-elastic-internal-origin", "kibana")
}
