package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"strconv"

	"github.com/elastic/go-elasticsearch/v8"
)

type ESEHandler struct {
	node             *NodeClient
	es               *elasticsearch.TypedClient
	proxy            *httputil.ReverseProxy
	whitelistHeaders []string
}

func NewESEHandler(node *NodeClient, es *elasticsearch.TypedClient, whitelistHeaders []string, proxy *httputil.ReverseProxy) *ESEHandler {
	return &ESEHandler{node: node, es: es, proxy: proxy, whitelistHeaders: whitelistHeaders}
}

type eseRequestBody struct {
	Params                    json.RawMessage `json:"params"`
	ReturnIntermediateResults bool            `json:"returnIntermediateResults,omitempty"`
	Stream                    bool            `json:"stream,omitempty"`
}

type eseSubmitParams struct {
	Index                      string          `json:"index,omitempty"`
	Body                       json.RawMessage `json:"body,omitempty"`
	WaitForCompletionTimeout   string          `json:"wait_for_completion_timeout,omitempty"`
	KeepAlive                  string          `json:"keep_alive,omitempty"`
	KeepOnCompletion           *bool           `json:"keep_on_completion,omitempty"`
	BatchedReduceSize          json.Number     `json:"batched_reduce_size,omitempty"`
	CcsMinimizeRoundtrips      *bool           `json:"ccs_minimize_roundtrips,omitempty"`
	MaxConcurrentShardRequests json.Number     `json:"max_concurrent_shard_requests,omitempty"`
	IgnoreUnavailable          *bool           `json:"ignore_unavailable,omitempty"`
	IgnoreThrottled            *bool           `json:"ignore_throttled,omitempty"`
	TrackTotalHits             json.RawMessage `json:"track_total_hits,omitempty"`
	Preference                 string          `json:"preference,omitempty"`
	Pit                        json.RawMessage `json:"pit,omitempty"`
}

func (h *ESEHandler) HandleSearch(w http.ResponseWriter, r *http.Request, id string) {
	auth, err := h.node.Authenticate(r.Context(), r)
	if err != nil || !auth.IsAuthenticated {
		writeJSON(w, http.StatusUnauthorized, kibanaErrorResponse{
			StatusCode: 401, Error: "Unauthorized", Message: "Authentication required",
		})
		return
	}

	var body eseRequestBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, kibanaErrorResponse{
			StatusCode: 400, Error: "Bad Request", Message: "Invalid request body",
		})
		return
	}

	if id == "" {
		h.submitSearch(w, r, body, auth)
	} else {
		h.getSearch(w, r, id, body, auth)
	}
}

func (h *ESEHandler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
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

	builder := h.es.AsyncSearch.Delete(id)
	for _, header := range h.whitelistHeaders {
		if v, ok := auth.ESHeaders[header]; ok && v != "" {
			builder.Header(header, v)
		}
	}

	esResp, err := builder.Perform(r.Context())
	if err != nil {
		writeJSON(w, http.StatusBadGateway, kibanaErrorResponse{
			StatusCode: 502, Error: "Bad Gateway", Message: "Failed to delete async search",
		})
		return
	}
	defer esResp.Body.Close()

	if esResp.StatusCode >= 400 {
		relayESError(w, esResp, "DELETE", fmt.Sprintf("/_async_search/%s", id))
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *ESEHandler) submitSearch(w http.ResponseWriter, r *http.Request, body eseRequestBody, auth *AuthResult) {
	var params eseSubmitParams
	if err := json.Unmarshal(body.Params, &params); err != nil {
		writeJSON(w, http.StatusBadRequest, kibanaErrorResponse{
			StatusCode: 400, Error: "Bad Request", Message: "Invalid params",
		})
		return
	}

	searchBody := params.Body
	if searchBody == nil {
		searchBody = json.RawMessage(`{}`)
	}

	builder := h.es.AsyncSearch.Submit().Raw(bytes.NewReader(searchBody))
	if params.Index != "" {
		builder.Index(params.Index)
	}
	if params.WaitForCompletionTimeout != "" {
		builder.WaitForCompletionTimeout(params.WaitForCompletionTimeout)
	}
	if params.KeepAlive != "" {
		builder.KeepAlive(params.KeepAlive)
	}
	if params.KeepOnCompletion != nil {
		builder.KeepOnCompletion(*params.KeepOnCompletion)
	}
	if params.BatchedReduceSize != "" {
		builder.BatchedReduceSize(string(params.BatchedReduceSize))
	}
	if params.CcsMinimizeRoundtrips != nil {
		builder.CcsMinimizeRoundtrips(*params.CcsMinimizeRoundtrips)
	}
	if params.MaxConcurrentShardRequests != "" {
		builder.MaxConcurrentShardRequests(string(params.MaxConcurrentShardRequests))
	}
	if params.IgnoreUnavailable != nil {
		builder.IgnoreUnavailable(*params.IgnoreUnavailable)
	}
	if params.IgnoreThrottled != nil {
		builder.IgnoreThrottled(*params.IgnoreThrottled)
	}
	builder.RestTotalHitsAsInt(true)
	if params.Preference != "" {
		builder.Preference(params.Preference)
	}

	for _, header := range h.whitelistHeaders {
		if v, ok := auth.ESHeaders[header]; ok && v != "" {
			builder.Header(header, v)
		}
	}

	esResp, err := builder.Perform(r.Context())
	if err != nil {
		log.Printf("ES /_async_search submit failed: %v", err)
		writeJSON(w, http.StatusBadGateway, kibanaErrorResponse{
			StatusCode: 502, Error: "Bad Gateway", Message: "Failed to submit async search",
		})
		return
	}
	defer esResp.Body.Close()

	index := params.Index
	if index == "" {
		index = "*"
	}
	path := fmt.Sprintf("/%s/_async_search", index)

	if esResp.StatusCode >= 400 {
		relayESError(w, esResp, "POST", path)
		return
	}

	if body.Stream {
		streamESEResponse(w, esResp, "POST", path)
		return
	}

	writeESEResponse(w, esResp, "POST", path)
}

func (h *ESEHandler) getSearch(w http.ResponseWriter, r *http.Request, id string, body eseRequestBody, auth *AuthResult) {
	var params eseSubmitParams
	if body.Params != nil {
		_ = json.Unmarshal(body.Params, &params)
	}

	builder := h.es.AsyncSearch.Get(id)
	if params.WaitForCompletionTimeout != "" {
		builder.WaitForCompletionTimeout(params.WaitForCompletionTimeout)
	}
	if params.KeepAlive != "" {
		builder.KeepAlive(params.KeepAlive)
	}

	for _, header := range h.whitelistHeaders {
		if v, ok := auth.ESHeaders[header]; ok && v != "" {
			builder.Header(header, v)
		}
	}

	esResp, err := builder.Perform(r.Context())
	if err != nil {
		log.Printf("ES async search get failed: %v", err)
		writeJSON(w, http.StatusBadGateway, kibanaErrorResponse{
			StatusCode: 502, Error: "Bad Gateway", Message: "Failed to get async search",
		})
		return
	}
	defer esResp.Body.Close()

	path := fmt.Sprintf("/_async_search/%s", id)
	if esResp.StatusCode >= 400 {
		relayESError(w, esResp, "GET", path)
		return
	}

	if body.Stream {
		streamESEResponse(w, esResp, "GET", path)
		return
	}

	writeESEResponse(w, esResp, "GET", path)
}

func streamESEResponse(w http.ResponseWriter, esResp *http.Response, method, path string) {
	asyncID := esResp.Header.Get("X-Elasticsearch-Async-Id")
	isRunning := esResp.Header.Get("X-Elasticsearch-Async-Is-Running") == "?1"

	reqParams, _ := json.Marshal(requestParams{Method: method, Path: path})
	w.Header().Set("kbn-search-is-restored", "?0")
	w.Header().Set("kbn-search-request-params", string(reqParams))
	if asyncID != "" {
		w.Header().Set("kbn-search-id", asyncID)
	}
	w.Header().Set("kbn-search-is-running", formatBoolHeader(isRunning))
	w.Header().Set("kbn-search-is-partial", formatBoolHeader(isRunning))
	w.Header().Set("Content-Type", esResp.Header.Get("Content-Type"))
	w.WriteHeader(esResp.StatusCode)
	io.Copy(w, esResp.Body)
}

func writeESEResponse(w http.ResponseWriter, esResp *http.Response, method, path string) {
	asyncID := esResp.Header.Get("X-Elasticsearch-Async-Id")
	isRunning := esResp.Header.Get("X-Elasticsearch-Async-Is-Running") == "?1"

	var rawResp json.RawMessage
	if err := json.NewDecoder(esResp.Body).Decode(&rawResp); err != nil {
		writeJSON(w, http.StatusBadGateway, kibanaErrorResponse{
			StatusCode: 502, Error: "Bad Gateway", Message: "Failed to parse ES response",
		})
		return
	}

	// ESE uses the ES async search response wrapper which has { response: <actual search result>, ... }
	// Extract the inner "response" field as rawResponse, or use the whole thing if not wrapped
	var wrapper struct {
		Response json.RawMessage `json:"response"`
	}
	innerResponse := rawResp
	if json.Unmarshal(rawResp, &wrapper) == nil && wrapper.Response != nil {
		innerResponse = wrapper.Response
	}

	var shards struct {
		Shards struct {
			Total      int `json:"total"`
			Successful int `json:"successful"`
			Failed     int `json:"failed"`
		} `json:"_shards"`
	}
	_ = json.Unmarshal(innerResponse, &shards)

	resp := kibanaSearchResponse{
		ID:          asyncID,
		RawResponse: innerResponse,
		IsRunning:   isRunning,
		IsPartial:   isRunning,
		Warning:     esResp.Header.Get("Warning"),
		RequestParams: &requestParams{Method: method, Path: path},
	}

	data, err := json.Marshal(resp)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, kibanaErrorResponse{
			StatusCode: 500, Error: "Internal Server Error", Message: "Failed to marshal response",
		})
		return
	}

	// Inject total and loaded at the top level
	var m map[string]json.RawMessage
	_ = json.Unmarshal(data, &m)
	m["total"], _ = json.Marshal(shards.Shards.Total)
	m["loaded"], _ = json.Marshal(shards.Shards.Successful + shards.Shards.Failed)
	final, _ := json.Marshal(m)

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write(final)
}

func formatBoolHeader(b bool) string {
	return "?" + strconv.Itoa(btoi(b))
}

func btoi(b bool) int {
	if b {
		return 1
	}
	return 0
}
