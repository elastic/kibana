package main

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/elastic/go-elasticsearch/v8"
)

type TLSConfig struct {
	Certificate string `json:"certificate"`
	Key         string `json:"key"`
}

type ESSSLConfig struct {
	VerificationMode       string   `json:"verificationMode"`
	CertificateAuthorities []string `json:"certificateAuthorities,omitempty"`
	Certificate            string   `json:"certificate,omitempty"`
	Key                    string   `json:"key,omitempty"`
}

type ESConfig struct {
	Hosts                   []string          `json:"hosts"`
	RequestHeadersWhitelist []string          `json:"requestHeadersWhitelist"`
	CustomHeaders           map[string]string `json:"customHeaders"`
	SSL                     ESSSLConfig       `json:"ssl"`
}

type BootstrapConfig struct {
	Host          string     `json:"host"`
	Port          int        `json:"port"`
	SocketPath    string     `json:"socketPath"`
	Secret        string     `json:"secret"`
	TLS           *TLSConfig `json:"tls,omitempty"`
	Elasticsearch *ESConfig  `json:"elasticsearch,omitempty"`
}

func main() {
	log.SetFlags(log.Ldate | log.Ltime | log.Lmicroseconds)

	config, err := readBootstrapConfig()
	if err != nil {
		log.Fatalf("failed to read bootstrap config: %v", err)
	}

	proxy := newNodeProxy(config.SocketPath)
	handler := newProxyHandler(proxy, config)

	addr := fmt.Sprintf("%s:%d", config.Host, config.Port)
	listener, err := createListener(addr, config.TLS)
	if err != nil {
		log.Fatalf("failed to create listener: %v", err)
	}

	server := &http.Server{
		Handler:           handler,
		ReadHeaderTimeout: 30 * time.Second,
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go watchStdin(cancel)

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)
	go func() {
		select {
		case sig := <-sigCh:
			log.Printf("received signal %v, shutting down", sig)
			cancel()
		case <-ctx.Done():
		}
	}()

	go func() {
		<-ctx.Done()
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer shutdownCancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			log.Printf("shutdown error: %v", err)
		}
	}()

	signalReady()
	log.Printf("kbn-sidecar listening on %s (tls=%v)", addr, config.TLS != nil)

	if err := server.Serve(listener); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("server error: %v", err)
	}

	log.Println("kbn-sidecar stopped")
}

func readBootstrapConfig() (*BootstrapConfig, error) {
	decoder := json.NewDecoder(os.Stdin)
	var config BootstrapConfig
	if err := decoder.Decode(&config); err != nil {
		return nil, fmt.Errorf("parsing config from stdin: %w", err)
	}
	if config.SocketPath == "" {
		return nil, fmt.Errorf("socketPath is required")
	}
	if config.Secret == "" {
		return nil, fmt.Errorf("secret is required")
	}
	if config.Port == 0 {
		return nil, fmt.Errorf("port is required")
	}
	return &config, nil
}

func createListener(addr string, tlsCfg *TLSConfig) (net.Listener, error) {
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return nil, err
	}
	if tlsCfg == nil {
		return ln, nil
	}
	cert, err := tls.LoadX509KeyPair(tlsCfg.Certificate, tlsCfg.Key)
	if err != nil {
		return nil, fmt.Errorf("loading TLS keypair: %w", err)
	}
	tc := &tls.Config{
		Certificates: []tls.Certificate{cert},
		MinVersion:   tls.VersionTLS12,
	}
	return tls.NewListener(ln, tc), nil
}

func newNodeProxy(socketPath string) *httputil.ReverseProxy {
	transport := &http.Transport{
		DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
			return (&net.Dialer{}).DialContext(ctx, "unix", socketPath)
		},
		MaxIdleConnsPerHost:   100,
		IdleConnTimeout:       90 * time.Second,
		ResponseHeaderTimeout: 0, // no timeout — Node controls response timing
	}
	proxy := &httputil.ReverseProxy{
		Director: func(req *http.Request) {
			req.URL.Scheme = "http"
			req.URL.Host = "kibana-node"
		},
		Transport:     transport,
		FlushInterval: -1, // stream responses immediately
	}
	return proxy
}

func newProxyHandler(proxy *httputil.ReverseProxy, config *BootstrapConfig) http.Handler {
	nodeClient := NewNodeClient(config.SocketPath, config.Secret)
	statusHandler := NewStatusHandler(nodeClient, proxy)

	var esqlHandler *ESQLAsyncHandler
	var eseHandler *ESEHandler
	if config.Elasticsearch != nil {
		esCfg := config.Elasticsearch
		globalHeaders := http.Header{}
		for k, v := range esCfg.CustomHeaders {
			globalHeaders.Set(k, v)
		}
		esClient, err := elasticsearch.NewTypedClient(elasticsearch.Config{
			Addresses: esCfg.Hosts,
			Header:    globalHeaders,
			Transport: &http.Transport{
				TLSClientConfig:     buildESTLSConfig(esCfg.SSL),
				MaxIdleConnsPerHost: 20,
				IdleConnTimeout:     90 * time.Second,
			},
		})
		if err != nil {
			log.Fatalf("failed to create ES client: %v", err)
		}
		esqlHandler = NewESQLAsyncHandler(nodeClient, esClient, esCfg.RequestHeadersWhitelist, proxy)
		eseHandler = NewESEHandler(nodeClient, esClient, esCfg.RequestHeadersWhitelist, proxy)
		log.Printf("Search handlers enabled (ES hosts: %v)", esCfg.Hosts)
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		stripSidecarHeaders(r)

		switch {
		case r.Method == http.MethodGet && r.URL.Path == "/api/status":
			log.Printf("[route] %s %s → Go (status)", r.Method, r.URL.Path)
			statusHandler.ServeHTTP(w, r)
		case esqlHandler != nil && r.Method == http.MethodPost && strings.HasPrefix(r.URL.Path, "/internal/search/esql_async"):
			id := strings.TrimPrefix(r.URL.Path, "/internal/search/esql_async")
			id = strings.TrimPrefix(id, "/")
			log.Printf("[route] %s %s → Go (esql_async)", r.Method, r.URL.Path)
			esqlHandler.HandleAsync(w, r, id)
		case esqlHandler != nil && r.Method == http.MethodDelete && strings.HasPrefix(r.URL.Path, "/internal/search/esql_async/"):
			id := strings.TrimPrefix(r.URL.Path, "/internal/search/esql_async/")
			log.Printf("[route] %s %s → Go (esql_async delete)", r.Method, r.URL.Path)
			esqlHandler.HandleDelete(w, r, id)
		case eseHandler != nil && r.Method == http.MethodPost && strings.HasPrefix(r.URL.Path, "/internal/search/ese"):
			id := strings.TrimPrefix(r.URL.Path, "/internal/search/ese")
			id = strings.TrimPrefix(id, "/")
			log.Printf("[route] %s %s → Go (ese)", r.Method, r.URL.Path)
			eseHandler.HandleSearch(w, r, id)
		case eseHandler != nil && r.Method == http.MethodDelete && strings.HasPrefix(r.URL.Path, "/internal/search/ese/"):
			id := strings.TrimPrefix(r.URL.Path, "/internal/search/ese/")
			log.Printf("[route] %s %s → Go (ese delete)", r.Method, r.URL.Path)
			eseHandler.HandleDelete(w, r, id)
		default:
			log.Printf("[route] %s %s → Node", r.Method, r.URL.Path)
			proxy.ServeHTTP(w, r)
		}
	})
}

func stripSidecarHeaders(r *http.Request) {
	for name := range r.Header {
		if strings.HasPrefix(strings.ToLower(name), "x-kbn-sidecar-") {
			r.Header.Del(name)
		}
	}
}

func signalReady() {
	fd3 := os.NewFile(3, "ready-signal")
	if fd3 == nil {
		log.Println("fd 3 not available, skipping ready signal")
		return
	}
	_, _ = fd3.Write([]byte("READY\n"))
	_ = fd3.Close()
}

func watchStdin(cancel context.CancelFunc) {
	buf := make([]byte, 1)
	for {
		_, err := os.Stdin.Read(buf)
		if err != nil {
			log.Println("stdin closed, initiating shutdown (orphan protection)")
			cancel()
			return
		}
	}
}

func buildESTLSConfig(ssl ESSSLConfig) *tls.Config {
	tc := &tls.Config{
		MinVersion: tls.VersionTLS12,
	}

	switch ssl.VerificationMode {
	case "none":
		tc.InsecureSkipVerify = true
	case "certificate":
		tc.InsecureSkipVerify = true
	}

	if len(ssl.CertificateAuthorities) > 0 {
		pool := x509.NewCertPool()
		for _, ca := range ssl.CertificateAuthorities {
			pool.AppendCertsFromPEM([]byte(ca))
		}
		tc.RootCAs = pool
		if ssl.VerificationMode == "certificate" {
			tc.InsecureSkipVerify = false
			tc.VerifyPeerCertificate = verifyCertOnly(pool)
		}
	}

	if ssl.Certificate != "" && ssl.Key != "" {
		cert, err := tls.X509KeyPair([]byte(ssl.Certificate), []byte(ssl.Key))
		if err == nil {
			tc.Certificates = []tls.Certificate{cert}
		}
	}

	return tc
}

func verifyCertOnly(pool *x509.CertPool) func(rawCerts [][]byte, _ [][]*x509.Certificate) error {
	return func(rawCerts [][]byte, _ [][]*x509.Certificate) error {
		certs := make([]*x509.Certificate, len(rawCerts))
		for i, raw := range rawCerts {
			cert, err := x509.ParseCertificate(raw)
			if err != nil {
				return fmt.Errorf("parsing certificate: %w", err)
			}
			certs[i] = cert
		}
		opts := x509.VerifyOptions{
			Roots:         pool,
			Intermediates: x509.NewCertPool(),
		}
		for _, cert := range certs[1:] {
			opts.Intermediates.AddCert(cert)
		}
		_, err := certs[0].Verify(opts)
		return err
	}
}
