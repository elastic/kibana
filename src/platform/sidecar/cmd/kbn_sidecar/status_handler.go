package main

import (
	"encoding/json"
	"log"
	"net/http"
	"net/http/httputil"
	"strings"
)

type StatusHandler struct {
	node  *NodeClient
	proxy *httputil.ReverseProxy
}

func NewStatusHandler(node *NodeClient, proxy *httputil.ReverseProxy) *StatusHandler {
	return &StatusHandler{node: node, proxy: proxy}
}

func (h *StatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.URL.Query().Get("v7format") == "true" {
		h.proxy.ServeHTTP(w, r)
		return
	}

	status, err := h.node.GetStatus(r.Context())
	if err != nil {
		log.Printf("status IPC failed, falling back to proxy: %v", err)
		h.proxy.ServeHTTP(w, r)
		return
	}

	decision := h.resolveDecision(r, status.Config)

	statusCode := http.StatusOK
	if status.CoreOverall.Level == "unavailable" || status.CoreOverall.Level == "critical" {
		statusCode = http.StatusServiceUnavailable
	}

	w.Header().Set("kbn-name", status.Config.ServerName)

	switch decision {
	case "unauthenticated", "no-monitor":
		writeJSON(w, statusCode, redactedResponse{
			Status: redactedStatus{
				Overall: redactedOverall{Level: status.CoreOverall.Level},
			},
		})
	case "full":
		writeJSON(w, statusCode, buildFullResponse(status))
	}
}

func (h *StatusHandler) resolveDecision(r *http.Request, config StatusConfig) string {
	if config.AllowAnonymous {
		return "full"
	}

	auth, err := h.node.Authenticate(r.Context(), r)
	if err != nil {
		log.Printf("authenticate IPC failed: %v", err)
		return "unauthenticated"
	}
	if !auth.IsAuthenticated {
		return "unauthenticated"
	}

	if config.StatusPageBypassMonitorPrivilege {
		return "full"
	}

	privs, err := h.node.CheckPrivileges(r.Context(), auth.ESHeaders, []string{"monitor"})
	if err != nil {
		log.Printf("check_privileges IPC failed: %v", err)
		return "no-monitor"
	}
	if !privs.HasAllRequested {
		return "no-monitor"
	}

	return "full"
}

type redactedResponse struct {
	Status redactedStatus `json:"status"`
}

type redactedStatus struct {
	Overall redactedOverall `json:"overall"`
}

type redactedOverall struct {
	Level string `json:"level"`
}

type fullResponse struct {
	Name    string          `json:"name"`
	UUID    string          `json:"uuid"`
	Version versionInfo     `json:"version"`
	Status  fullStatus      `json:"status"`
	Metrics json.RawMessage `json:"metrics"`
}

type versionInfo struct {
	Number        string `json:"number"`
	BuildHash     string `json:"build_hash"`
	BuildNumber   int    `json:"build_number"`
	BuildSnapshot bool   `json:"build_snapshot"`
	BuildFlavor   string `json:"build_flavor"`
	BuildDate     string `json:"build_date"`
}

type fullStatus struct {
	Overall StatusLevel            `json:"overall"`
	Core    map[string]StatusLevel `json:"core"`
	Plugins map[string]StatusLevel `json:"plugins"`
}

func buildFullResponse(status *StatusBlob) *fullResponse {
	pkg := status.Config.PackageInfo
	version := pkg.Version
	isSnapshot := strings.HasSuffix(version, "-SNAPSHOT")
	versionNumber := strings.TrimSuffix(version, "-SNAPSHOT")

	return &fullResponse{
		Name: status.Config.ServerName,
		UUID: status.Config.UUID,
		Version: versionInfo{
			Number:        versionNumber,
			BuildHash:     pkg.BuildSha,
			BuildNumber:   pkg.BuildNum,
			BuildSnapshot: isSnapshot,
			BuildFlavor:   pkg.BuildFlavor,
			BuildDate:     pkg.BuildDate,
		},
		Status: fullStatus{
			Overall: status.Overall,
			Core:    status.Core,
			Plugins: status.Plugins,
		},
		Metrics: status.Metrics,
	}
}

func writeJSON(w http.ResponseWriter, statusCode int, body any) {
	data, err := json.Marshal(body)
	if err != nil {
		log.Printf("failed to marshal JSON response: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(statusCode)
	_, _ = w.Write(data)
}
