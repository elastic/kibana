package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httputil"

	"github.com/elastic/go-elasticsearch/v8"
)

type ESQLAsyncHandler struct {
	node             *NodeClient
	es               *elasticsearch.TypedClient
	proxy            *httputil.ReverseProxy
	whitelistHeaders []string
}

func NewESQLAsyncHandler(node *NodeClient, es *elasticsearch.TypedClient, whitelistHeaders []string, proxy *httputil.ReverseProxy) *ESQLAsyncHandler {
	return &ESQLAsyncHandler{node: node, es: es, proxy: proxy, whitelistHeaders: whitelistHeaders}
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


type kibanaSearchResponse struct {
	ID            string          `json:"id,omitempty"`
	RawResponse   json.RawMessage `json:"rawResponse"`
	IsPartial     bool            `json:"isPartial"`
	IsRunning     bool            `json:"isRunning"`
	Warning       string          `json:"warning,omitempty"`
	RequestParams *requestParams  `json:"requestParams,omitempty"`
}

type requestParams struct {
	Method string `json:"method"`
	Path   string `json:"path"`
}

type kibanaErrorResponse struct {
	StatusCode int                    `json:"statusCode"`
	Error      string                 `json:"error"`
	Message    string                 `json:"message"`
	Attributes map[string]interface{} `json:"attributes,omitempty"`
}

func (h *ESQLAsyncHandler) HandleAsync(w http.ResponseWriter, r *http.Request, id string) {
	auth, err := h.node.Authenticate(r.Context(), r)
	if err != nil || !auth.IsAuthenticated {
		writeJSON(w, http.StatusUnauthorized, kibanaErrorResponse{
			StatusCode: 401, Error: "Unauthorized", Message: "Authentication required",
		})
		return
	}

	var body esqlRequestBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, kibanaErrorResponse{
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
	auth, err := h.node.Authenticate(r.Context(), r)
	if err != nil || !auth.IsAuthenticated {
		writeJSON(w, http.StatusUnauthorized, kibanaErrorResponse{
			StatusCode: 401, Error: "Unauthorized", Message: "Authentication required",
		})
		return
	}

	if id == "" {
		writeJSON(w, http.StatusBadRequest, kibanaErrorResponse{
			StatusCode: 400, Error: "Bad Request", Message: "Missing async search ID",
		})
		return
	}

	builder := h.es.Esql.AsyncQueryDelete(id)
	for _, header := range h.whitelistHeaders {
		if v, ok := auth.ESHeaders[header]; ok && v != "" {
			builder.Header(header, v)
		}
	}

	esResp, err := builder.Perform(r.Context())
	if err != nil {
		writeJSON(w, http.StatusBadGateway, kibanaErrorResponse{
			StatusCode: 502, Error: "Bad Gateway", Message: "Failed to cancel ES query",
		})
		return
	}
	defer esResp.Body.Close()

	if esResp.StatusCode >= 400 {
		relayESError(w, esResp, "DELETE", fmt.Sprintf("/_query/async/%s", id))
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *ESQLAsyncHandler) submitAsync(w http.ResponseWriter, r *http.Request, body esqlRequestBody, auth *AuthResult) {
	var params esqlParams
	if err := json.Unmarshal(body.Params, &params); err != nil {
		writeJSON(w, http.StatusBadRequest, kibanaErrorResponse{
			StatusCode: 400, Error: "Bad Request", Message: "Invalid params",
		})
		return
	}

	builder := h.es.Esql.AsyncQuery().Raw(bytes.NewReader(stripQueryParams(body.Params)))
	if params.DropNullColumns {
		builder.DropNullColumns(true)
	}
	for _, header := range h.whitelistHeaders {
		if v, ok := auth.ESHeaders[header]; ok && v != "" {
			builder.Header(header, v)
		}
	}

	esResp, err := builder.Perform(r.Context())
	if err != nil {
		log.Printf("ES /_query/async submit failed: %v", err)
		writeJSON(w, http.StatusBadGateway, kibanaErrorResponse{
			StatusCode: 502, Error: "Bad Gateway", Message: "Failed to submit ES query",
		})
		return
	}
	defer esResp.Body.Close()

	if esResp.StatusCode >= 400 {
		relayESError(w, esResp, "POST", "/_query/async")
		return
	}

	if body.Stream {
		streamResponse(w, esResp, "POST", "/_query/async")
		return
	}

	writeAsyncResponse(w, esResp, "POST", "/_query/async")
}

func (h *ESQLAsyncHandler) getAsync(w http.ResponseWriter, r *http.Request, id string, body esqlRequestBody, auth *AuthResult) {
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
	for _, header := range h.whitelistHeaders {
		if v, ok := auth.ESHeaders[header]; ok && v != "" {
			builder.Header(header, v)
		}
	}

	esResp, err := builder.Perform(r.Context())
	if err != nil {
		log.Printf("ES async get failed: %v", err)
		writeJSON(w, http.StatusBadGateway, kibanaErrorResponse{
			StatusCode: 502, Error: "Bad Gateway", Message: "Failed to get ES async query",
		})
		return
	}
	defer esResp.Body.Close()

	path := fmt.Sprintf("/_query/async/%s", id)
	if esResp.StatusCode >= 400 {
		relayESError(w, esResp, "GET", path)
		return
	}

	if body.Stream {
		streamResponse(w, esResp, "GET", path)
		return
	}

	writeAsyncResponse(w, esResp, "GET", path)
}

func (h *ESQLAsyncHandler) stopAsync(w http.ResponseWriter, r *http.Request, id string, body esqlRequestBody, auth *AuthResult) {
	builder := h.es.Esql.AsyncQueryStop(id)
	if params := parseParams(body.Params); params.DropNullColumns {
		builder.DropNullColumns(true)
	}
	for _, header := range h.whitelistHeaders {
		if v, ok := auth.ESHeaders[header]; ok && v != "" {
			builder.Header(header, v)
		}
	}

	esResp, err := builder.Perform(r.Context())
	if err != nil {
		log.Printf("ES async stop failed: %v", err)
		writeJSON(w, http.StatusBadGateway, kibanaErrorResponse{
			StatusCode: 502, Error: "Bad Gateway", Message: "Failed to stop ES async query",
		})
		return
	}
	defer esResp.Body.Close()

	path := fmt.Sprintf("/_query/async/%s/_stop", id)
	if esResp.StatusCode >= 400 {
		relayESError(w, esResp, "POST", path)
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
	reqParams, _ := json.Marshal(requestParams{Method: method, Path: path})
	w.Header().Set("kbn-search-is-restored", "?0")
	w.Header().Set("kbn-search-request-params", string(reqParams))
	w.Header().Set("Content-Type", esResp.Header.Get("Content-Type"))
	w.WriteHeader(esResp.StatusCode)
	io.Copy(w, esResp.Body)
}

func writeAsyncResponse(w http.ResponseWriter, esResp *http.Response, method, path string) {
	var rawResp json.RawMessage
	if err := json.NewDecoder(esResp.Body).Decode(&rawResp); err != nil {
		writeJSON(w, http.StatusBadGateway, kibanaErrorResponse{
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

	writeJSON(w, http.StatusOK, kibanaSearchResponse{
		ID:          asyncMeta.ID,
		RawResponse: rawResp,
		IsRunning:   asyncMeta.IsRunning,
		IsPartial:   asyncMeta.IsPartial,
		Warning:     esResp.Header.Get("Warning"),
		RequestParams: &requestParams{Method: method, Path: path},
	})
}


func relayESError(w http.ResponseWriter, esResp *http.Response, method, path string) {
	var esBody map[string]json.RawMessage
	_ = json.NewDecoder(esResp.Body).Decode(&esBody)

	attrs := map[string]interface{}{
		"requestParams": requestParams{Method: method, Path: path},
	}
	if errField, ok := esBody["error"]; ok {
		attrs["error"] = errField
	}
	if respField, ok := esBody["response"]; ok {
		attrs["rawResponse"] = respField
	}

	message := fmt.Sprintf("ES returned %d", esResp.StatusCode)
	if reason, ok := esBody["error"]; ok {
		var errObj struct {
			Reason string `json:"reason"`
		}
		if json.Unmarshal(reason, &errObj) == nil && errObj.Reason != "" {
			message = errObj.Reason
		}
	}

	writeJSON(w, esResp.StatusCode, kibanaErrorResponse{
		StatusCode: esResp.StatusCode,
		Error:      http.StatusText(esResp.StatusCode),
		Message:    message,
		Attributes: attrs,
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

func mustMarshal(v interface{}) []byte {
	data, err := json.Marshal(v)
	if err != nil {
		panic(fmt.Sprintf("json.Marshal failed: %v", err))
	}
	return data
}
