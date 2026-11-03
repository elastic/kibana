package main

import (
	"context"
	"crypto/tls"
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
)

type TLSConfig struct {
	Certificate string `json:"certificate"`
	Key         string `json:"key"`
}

type BootstrapConfig struct {
	Host       string     `json:"host"`
	Port       int        `json:"port"`
	SocketPath string     `json:"socketPath"`
	Secret     string     `json:"secret"`
	TLS        *TLSConfig `json:"tls,omitempty"`
}

func main() {
	log.SetFlags(log.Ldate | log.Ltime | log.Lmicroseconds)

	config, err := readBootstrapConfig()
	if err != nil {
		log.Fatalf("failed to read bootstrap config: %v", err)
	}

	proxy := newNodeProxy(config.SocketPath)
	handler := newProxyHandler(proxy, config.Secret, config.SocketPath)

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

func newProxyHandler(proxy *httputil.ReverseProxy, secret string, socketPath string) http.Handler {
	nodeClient := NewNodeClient(socketPath, secret)
	statusHandler := NewStatusHandler(nodeClient, proxy)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		stripSidecarHeaders(r)

		if r.Method == http.MethodGet && r.URL.Path == "/api/status" {
			statusHandler.ServeHTTP(w, r)
			return
		}

		proxy.ServeHTTP(w, r)
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
