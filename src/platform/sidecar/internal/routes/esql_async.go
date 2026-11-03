package routes

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httputil"

	"github.com/elastic/go-elasticsearch/v8"
	"github.com/elastic/kibana/src/platform/sidecar/internal/platform"
)

type ESQLAsyncHandler struct {
	es               *elasticsearch.TypedClient
	proxy            *httputil.ReverseProxy
	whitelistHeaders []string
}

func NewESQLAsyncHandler(es *elasticsearch.TypedClient, whitelistHeaders []string, proxy *httputil.ReverseProxy) *ESQLAsyncHandler {
	return &ESQLAsyncHandler{es: es, proxy: proxy, whitelistHeaders: whitelistHeaders}
}

type esqlRequestBody struct {
	Params                    json.RawMessage `json:"params"`
	ReturnIntermediateResults bool            `json:"returnIntermediateResults,omitempty"`
	Stream                    bool            `json:"stream,omitempty"`
}

type esqlParams struct {
	Query                    string          `json:"query"`
	TimeZone                 string          `json:"time_zone,omitempty"`
	Filter                   json.RawMessage `json:"filter,omitempty"`
	Locale                   string          `json:"locale,omitempty"`
	IncludeExecutionMetadata bool            `json:"include_execution_metadata,omitempty"`
	DropNullColumns          bool            `json:"dropNullColumns,omitempty"`
	Settings                 json.RawMessage `json:"settings,omitempty"`
	Params                   json.RawMessage `json:"params,omitempty"`
	KeepAlive                string          `json:"keep_alive,omitempty"`
	WaitForCompletionTimeout string          `json:"wait_for_completion_timeout,omitempty"`
}

func (h *ESQLAsyncHandler) HandleAsync(w http.ResponseWriter, r *http.Request, id string) {
	auth := platform.AuthFromContext(r.Context())

	var body esqlRequestBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		platform.WriteJSON(w, http.StatusBadRequest, platform.KibanaErrorResponse{
			StatusCode: 400, Error: "Bad Request", Message: "Invalid request body",
		})
		return
	}

	switch {
	case id == "":
		h.submitAsync(w, r, body, auth)
	case body.ReturnIntermediateResults:
		h.stopAsync(w, r, id, body, auth)
	default:
		h.getAsync(w, r, id, body, auth)
	}
}

func (h *ESQLAsyncHandler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	auth := platform.AuthFromContext(r.Context())

	if id == "" {
		platform.WriteJSON(w, http.StatusBadRequest, platform.KibanaErrorResponse{
			StatusCode: 400, Error: "Bad Request", Message: "Missing async search ID",
		})
		return
	}

	builder := h.es.Esql.AsyncQueryDelete(id)
	for _, hdr := range h.whitelistHeaders {
		if v, ok := auth.ESHeaders[hdr]; ok && v != "" {
			builder.Header(hdr, v)
		}
	}

	esResp, err := builder.Perform(r.Context())
	if err != nil {
		platform.WriteJSON(w, http.StatusBadGateway, platform.KibanaErrorResponse{
			StatusCode: 502, Error: "Bad Gateway", Message: "Failed to cancel ES query",
		})
		return
	}
	defer esResp.Body.Close()

	if esResp.StatusCode >= 400 {
		platform.RelayESError(w, esResp, "DELETE", fmt.Sprintf("/_query/async/%s", id))
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *ESQLAsyncHandler) submitAsync(w http.ResponseWriter, r *http.Request, body esqlRequestBody, auth *platform.AuthResult) {
	var params esqlParams
	if err := json.Unmarshal(body.Params, &params); err != nil {
		platform.WriteJSON(w, http.StatusBadRequest, platform.KibanaErrorResponse{
			StatusCode: 400, Error: "Bad Request", Message: "Invalid params",
		})
		return
	}

	builder := h.es.Esql.AsyncQuery().Raw(bytes.NewReader(stripQueryParams(body.Params)))
	if params.DropNullColumns {
		builder.DropNullColumns(true)
	}
	for _, hdr := range h.whitelistHeaders {
		if v, ok := auth.ESHeaders[hdr]; ok && v != "" {
			builder.Header(hdr, v)
		}
	}

	esResp, err := builder.Perform(r.Context())
	if err != nil {
		log.Printf("ES /_query/async submit failed: %v", err)
		platform.WriteJSON(w, http.StatusBadGateway, platform.KibanaErrorResponse{
			StatusCode: 502, Error: "Bad Gateway", Message: "Failed to submit ES query",
		})
		return
	}
	defer esResp.Body.Close()

	if esResp.StatusCode >= 400 {
		platform.RelayESError(w, esResp, "POST", "/_query/async")
		return
	}

	if body.Stream {
		streamResponse(w, esResp, "POST", "/_query/async")
		return
	}

	writeAsyncResponse(w, esResp, "POST", "/_query/async")
}

func (h *ESQLAsyncHandler) getAsync(w http.ResponseWriter, r *http.Request, id string, body esqlRequestBody, auth *platform.AuthResult) {
	var params esqlParams
	if body.Params != nil {
		_ = json.Unmarshal(body.Params, &params)
	}

	builder := h.es.Esql.AsyncQueryGet(id)
	if params.WaitForCompletionTimeout != "" {
		builder.WaitForCompletionTimeout(params.WaitForCompletionTimeout)
	}
	if params.KeepAlive != "" {
		builder.KeepAlive(params.KeepAlive)
	}
	if params.DropNullColumns {
		builder.DropNullColumns(true)
	}
	for _, hdr := range h.whitelistHeaders {
		if v, ok := auth.ESHeaders[hdr]; ok && v != "" {
			builder.Header(hdr, v)
		}
	}

	esResp, err := builder.Perform(r.Context())
	if err != nil {
		log.Printf("ES async get failed: %v", err)
		platform.WriteJSON(w, http.StatusBadGateway, platform.KibanaErrorResponse{
			StatusCode: 502, Error: "Bad Gateway", Message: "Failed to get ES async query",
		})
		return
	}
	defer esResp.Body.Close()

	path := fmt.Sprintf("/_query/async/%s", id)
	if esResp.StatusCode >= 400 {
		platform.RelayESError(w, esResp, "GET", path)
		return
	}

	if body.Stream {
		streamResponse(w, esResp, "GET", path)
		return
	}

	writeAsyncResponse(w, esResp, "GET", path)
}

func (h *ESQLAsyncHandler) stopAsync(w http.ResponseWriter, r *http.Request, id string, body esqlRequestBody, auth *platform.AuthResult) {
	builder := h.es.Esql.AsyncQueryStop(id)
	if params := parseParams(body.Params); params.DropNullColumns {
		builder.DropNullColumns(true)
	}
	for _, hdr := range h.whitelistHeaders {
		if v, ok := auth.ESHeaders[hdr]; ok && v != "" {
			builder.Header(hdr, v)
		}
	}

	esResp, err := builder.Perform(r.Context())
	if err != nil {
		log.Printf("ES async stop failed: %v", err)
		platform.WriteJSON(w, http.StatusBadGateway, platform.KibanaErrorResponse{
			StatusCode: 502, Error: "Bad Gateway", Message: "Failed to stop ES async query",
		})
		return
	}
	defer esResp.Body.Close()

	path := fmt.Sprintf("/_query/async/%s/_stop", id)
	if esResp.StatusCode >= 400 {
		platform.RelayESError(w, esResp, "POST", path)
		return
	}

	if body.Stream {
		streamResponse(w, esResp, "POST", path)
		return
	}

	writeAsyncResponse(w, esResp, "POST", path)
}

func parseParams(raw json.RawMessage) esqlParams {
	var p esqlParams
	if raw != nil {
		_ = json.Unmarshal(raw, &p)
	}
	return p
}

func streamResponse(w http.ResponseWriter, esResp *http.Response, method, path string) {
	reqParams, _ := json.Marshal(platform.RequestParams{Method: method, Path: path})
	w.Header().Set("kbn-search-is-restored", "?0")
	w.Header().Set("kbn-search-request-params", string(reqParams))
	w.Header().Set("Content-Type", esResp.Header.Get("Content-Type"))
	w.WriteHeader(esResp.StatusCode)
	io.Copy(w, esResp.Body)
}

func writeAsyncResponse(w http.ResponseWriter, esResp *http.Response, method, path string) {
	var rawResp json.RawMessage
	if err := json.NewDecoder(esResp.Body).Decode(&rawResp); err != nil {
		platform.WriteJSON(w, http.StatusBadGateway, platform.KibanaErrorResponse{
			StatusCode: 502, Error: "Bad Gateway", Message: "Failed to parse ES async response",
		})
		return
	}

	var asyncMeta struct {
		ID        string `json:"id"`
		IsRunning bool   `json:"is_running"`
		IsPartial bool   `json:"is_partial"`
	}
	_ = json.Unmarshal(rawResp, &asyncMeta)

	platform.WriteJSON(w, http.StatusOK, platform.KibanaSearchResponse{
		ID:          asyncMeta.ID,
		RawResponse: rawResp,
		IsRunning:   asyncMeta.IsRunning,
		IsPartial:   asyncMeta.IsPartial,
		Warning:     esResp.Header.Get("Warning"),
		RequestParams: &platform.RequestParams{Method: method, Path: path},
	})
}

var queryParamKeys = []string{"dropNullColumns", "drop_null_columns", "keep_alive", "wait_for_completion_timeout"}

func stripQueryParams(raw json.RawMessage) []byte {
	var m map[string]json.RawMessage
	if err := json.Unmarshal(raw, &m); err != nil {
		return raw
	}
	for _, key := range queryParamKeys {
		delete(m, key)
	}
	out, err := json.Marshal(m)
	if err != nil {
		return raw
	}
	return out
}
