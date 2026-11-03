package platform

import (
	"context"
	"net/http"
)

type contextKey string

const authContextKey contextKey = "auth"

func AuthMiddleware(node *NodeClient, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		auth, err := node.Authenticate(r.Context(), r)
		if err != nil || !auth.IsAuthenticated {
			WriteJSON(w, http.StatusUnauthorized, KibanaErrorResponse{
				StatusCode: 401, Error: "Unauthorized", Message: "Authentication required",
			})
			return
		}
		ctx := context.WithValue(r.Context(), authContextKey, auth)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

func AuthFromContext(ctx context.Context) *AuthResult {
	auth, _ := ctx.Value(authContextKey).(*AuthResult)
	return auth
}
