#!/usr/bin/env bash
# Shared Kibana API utilities.
# Source this file from any skill or script to get auto-detected KIBANA_URL,
# KIBANA_AUTH, and a kibana_curl wrapper.
#
# Usage:
#   REPO_ROOT="$(git rev-parse --show-toplevel)"
#   source "$REPO_ROOT/scripts/kibana_api_common.sh"
#
# After sourcing, KIBANA_URL and KIBANA_AUTH are set to working values.
# If auto-detection fails and no overrides were provided, the script exits with an error.

# Allow callers to override before sourcing
KIBANA_URL="${KIBANA_URL:-}"
KIBANA_AUTH="${KIBANA_AUTH:-}"

# Candidates to try: protocol x auth permutations
_URLS=("http://localhost:5601" "https://localhost:5601")
_AUTHS=("elastic:changeme" "elastic_serverless:changeme")

_try_kibana() {
  local url="$1"
  local auth="$2"
  local http_code

  # First check if Kibana is reachable at all (/api/status is unauthenticated)
  http_code="$(curl -s -o /dev/null -w "%{http_code}" -k "$url/api/status" 2>/dev/null || echo "000")"
  if [[ "$http_code" == "000" ]]; then
    return 1  # Not reachable
  fi

  # Then validate credentials against an authenticated endpoint.
  # 401 = wrong creds; anything else (200, 400, 404) = creds are valid.
  http_code="$(curl -s -o /dev/null -w "%{http_code}" -k -u "$auth" \
    -H "kbn-xsrf: true" \
    -H "x-elastic-internal-origin: Kibana" \
    "$url/api/data_sources" 2>/dev/null || echo "000")"
  [[ "$http_code" != "000" && "$http_code" != "401" ]]
}

detect_kibana() {
  # If both are already set (by caller or env), just validate
  if [[ -n "$KIBANA_URL" && -n "$KIBANA_AUTH" ]]; then
    if _try_kibana "$KIBANA_URL" "$KIBANA_AUTH"; then
      return 0
    else
      echo "Warning: Provided KIBANA_URL=$KIBANA_URL with KIBANA_AUTH did not respond. Falling back to auto-detection." >&2
      KIBANA_URL=""
      KIBANA_AUTH=""
    fi
  fi

  # If only URL is set, try both auth options against it
  if [[ -n "$KIBANA_URL" ]]; then
    for auth in "${_AUTHS[@]}"; do
      if _try_kibana "$KIBANA_URL" "$auth"; then
        KIBANA_AUTH="$auth"
        return 0
      fi
    done
    echo "Error: Kibana at $KIBANA_URL did not respond with any known credentials." >&2
    return 1
  fi

  # Full auto-detection: try all permutations
  for url in "${_URLS[@]}"; do
    for auth in "${_AUTHS[@]}"; do
      if _try_kibana "$url" "$auth"; then
        KIBANA_URL="$url"
        KIBANA_AUTH="$auth"
        echo "Detected Kibana at $KIBANA_URL (auth: ${auth%%:*})" >&2
        return 0
      fi
    done
  done

  echo "Error: Could not detect a running Kibana instance." >&2
  echo "Tried: ${_URLS[*]} with auth users: elastic, elastic_serverless" >&2
  echo "" >&2
  echo "Please ensure Kibana is running, or set KIBANA_URL and KIBANA_AUTH explicitly." >&2
  return 1
}

# Wrapper around curl with Kibana auth, required headers, and TLS handling.
kibana_curl() {
  local tls_flag=""
  if [[ "$KIBANA_URL" == https://* ]]; then
    tls_flag="-k"
  fi
  curl -s $tls_flag \
    -u "$KIBANA_AUTH" \
    -H "kbn-xsrf: true" \
    -H "x-elastic-internal-origin: Kibana" \
    "$@"
}

# Run detection on source
detect_kibana
