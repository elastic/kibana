package platform

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
)

type KibanaSearchResponse struct {
	ID            string          `json:"id,omitempty"`
	RawResponse   json.RawMessage `json:"rawResponse"`
	IsPartial     bool            `json:"isPartial"`
	IsRunning     bool            `json:"isRunning"`
	Warning       string          `json:"warning,omitempty"`
	RequestParams *RequestParams  `json:"requestParams,omitempty"`
}

type RequestParams struct {
	Method string `json:"method"`
	Path   string `json:"path"`
}

type KibanaErrorResponse struct {
	StatusCode int                    `json:"statusCode"`
	Error      string                 `json:"error"`
	Message    string                 `json:"message"`
	Attributes map[string]interface{} `json:"attributes,omitempty"`
}

func WriteJSON(w http.ResponseWriter, statusCode int, body any) {
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

func RelayESError(w http.ResponseWriter, esResp *http.Response, method, path string) {
	var esBody map[string]json.RawMessage
	_ = json.NewDecoder(esResp.Body).Decode(&esBody)

	attrs := map[string]interface{}{
		"requestParams": RequestParams{Method: method, Path: path},
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

	WriteJSON(w, esResp.StatusCode, KibanaErrorResponse{
		StatusCode: esResp.StatusCode,
		Error:      http.StatusText(esResp.StatusCode),
		Message:    message,
		Attributes: attrs,
	})
}

func StripSidecarHeaders(r *http.Request) {
	for name := range r.Header {
		if strings.HasPrefix(strings.ToLower(name), "x-kbn-sidecar-") {
			r.Header.Del(name)
		}
	}
}

