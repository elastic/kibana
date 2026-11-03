package platform

import (
	"context"
	"net"
	"net/http"
	"net/http/httputil"
	"time"
)

func NewNodeProxy(socketPath string) *httputil.ReverseProxy {
	transport := &http.Transport{
		DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
			return (&net.Dialer{}).DialContext(ctx, "unix", socketPath)
		},
		MaxIdleConnsPerHost:   100,
		IdleConnTimeout:       90 * time.Second,
		ResponseHeaderTimeout: 0,
	}
	return &httputil.ReverseProxy{
		Director: func(req *http.Request) {
			req.URL.Scheme = "http"
			req.URL.Host = "kibana-node"
		},
		Transport:     transport,
		FlushInterval: -1,
	}
}
