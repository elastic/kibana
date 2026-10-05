#!/usr/bin/env bash

set -euo pipefail

GCLOUD_EMAIL_POSTFIX="elastic-kibana-ci.iam.gserviceaccount.com"
GCLOUD_SA_PROXY_EMAIL="kibana-ci-sa-proxy@$GCLOUD_EMAIL_POSTFIX"
GCLOUD_WIF_AUDIENCE="//iam.googleapis.com/projects/1003139005402/locations/global/workloadIdentityPools/buildkite/providers/buildkite"
GCP_OIDC_TOKEN_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/gcp_oidc_token.sh"

KIBANA_WIF_CREDENTIALS_DIR="${KIBANA_WIF_CREDENTIALS_DIR:-${TMPDIR:-/tmp}/kibana-wif-${BUILDKITE_JOB_ID:-local}}"
WIF_CREDENTIALS_FILE="$KIBANA_WIF_CREDENTIALS_DIR/credentials.json"

# access tokens live 60 minutes and can't be refreshed in place, so re-minting after 30 leaves every
# command at least 30 minutes. Single commands running longer than that need --auto-refresh.
ACCESS_TOKEN_MAX_AGE_MINUTES=30
TOKEN_EXCHANGE_ATTEMPTS=5

USAGE="Usage:
  $0 <bucket|gs://bucket|email>                  Share one access token per service account for the rest of the job
  $0 --auto-refresh <bucket|gs://bucket|email>   Let gcloud refresh credentials itself (one token exchange per gcloud process)
  $0 --unset-impersonation                       Drop the active service account from the gcloud config
  $0 --logout-gcloud                             Also remove this job's credentials"

main() {
  case "${1:-}" in
    --unset-impersonation)
      clear_gcloud_auth_config
      ;;
    --logout-gcloud)
      logout_gcloud
      ;;
    --auto-refresh)
      [[ -n "${2:-}" ]] || fail "$USAGE"
      activate_with_auto_refresh "$(resolve_service_account "$2")"
      ;;
    "")
      fail "$USAGE"
      ;;
    *)
      activate_with_shared_token "$(resolve_service_account "$1")"
      ;;
  esac
}

# Every gcloud process that impersonates does its own Security Token Service exchange, and those are rate limited
# per project. Pointing gcloud at a pre-minted token instead makes later gcloud processes exchange nothing.
activate_with_shared_token() {
  local email="$1"
  local token_file="$KIBANA_WIF_CREDENTIALS_DIR/$email.token"

  require_tools
  if [[ -s "$token_file" && -n "$(find "$token_file" -mmin "-$ACCESS_TOKEN_MAX_AGE_MINUTES")" ]]; then
    echo "Reusing access token for $email"
  else
    mint_access_token "$email" "$token_file"
  fi

  clear_gcloud_auth_config
  gcloud config set auth/access_token_file "$token_file"
  echo "Activated service account $email"
}

activate_with_auto_refresh() {
  local email="$1"

  require_tools
  write_wif_credentials_file
  if ! gcloud auth login --cred-file="$WIF_CREDENTIALS_FILE" --quiet --no-user-output-enabled; then
    fail "Failed to activate service account $GCLOUD_SA_PROXY_EMAIL."
  fi

  clear_gcloud_auth_config
  gcloud config set auth/impersonate_service_account "$email"
  echo "Activated service account $email (auto-refresh)"
}

logout_gcloud() {
  clear_gcloud_auth_config
  if [[ -x "$(command -v gcloud)" ]] && gcloud auth list 2>/dev/null | grep -q "$GCLOUD_SA_PROXY_EMAIL"; then
    gcloud auth revoke "$GCLOUD_SA_PROXY_EMAIL" --no-user-output-enabled
  fi
  rm -rf "$KIBANA_WIF_CREDENTIALS_DIR"
}

clear_gcloud_auth_config() {
  if [[ -x "$(command -v gcloud)" ]]; then
    gcloud config unset auth/impersonate_service_account
    gcloud config unset auth/access_token_file
  fi
}

# Retries only on rate limiting; any other failure is a configuration problem and fails fast.
mint_access_token() {
  local email="$1" token_file="$2"
  local partial_file="$token_file.partial" attempt error delay

  write_wif_credentials_file
  for ((attempt = 1; attempt <= TOKEN_EXCHANGE_ATTEMPTS; attempt++)); do
    if error="$(print_impersonated_access_token "$email" 2>&1 > "$partial_file")" && [[ -s "$partial_file" ]]; then
      mv "$partial_file" "$token_file"
      echo "Minted access token for $email"
      return 0
    fi

    if [[ "$error" != *quota_exceeded* ]] || ((attempt == TOKEN_EXCHANGE_ATTEMPTS)); then
      break
    fi
    delay=$((attempt * 5 + RANDOM % 10))
    echo "Token exchange rate limited, retrying in ${delay}s (attempt $attempt/$TOKEN_EXCHANGE_ATTEMPTS)"
    sleep "$delay"
  done

  rm -f "$partial_file"
  echo "$error" >&2
  fail "Failed to mint an access token for $email."
}

# Empty CLOUDSDK_* values override the gcloud config, so a token file left by an earlier activation isn't used here.
print_impersonated_access_token() {
  CLOUDSDK_AUTH_ACCESS_TOKEN_FILE="" \
    CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE="$WIF_CREDENTIALS_FILE" \
    CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT="$1" \
    gcloud auth print-access-token --verbosity=error
}

# gcloud runs the executable to request a fresh Buildkite OIDC token whenever it needs one.
write_wif_credentials_file() {
  if [[ -s "$WIF_CREDENTIALS_FILE" ]]; then
    return 0
  fi

  mkdir -p -m 700 "$KIBANA_WIF_CREDENTIALS_DIR"
  gcloud iam workload-identity-pools create-cred-config \
    "${GCLOUD_WIF_AUDIENCE#//iam.googleapis.com/}" \
    --service-account="$GCLOUD_SA_PROXY_EMAIL" \
    --executable-command="\"$GCP_OIDC_TOKEN_SCRIPT\"" \
    --output-file="$WIF_CREDENTIALS_FILE"
}

resolve_service_account() {
  local argument="$1"
  local bucket="${argument#gs://}"

  if [[ "$argument" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    echo "$argument"
    return 0
  fi

  case "$bucket" in
    "kibana-ci-es-snapshots-daily")
      echo "kibana-ci-access-es-daily@$GCLOUD_EMAIL_POSTFIX"
      ;;
    "kibana-ci-es-snapshots-permanent")
      echo "kibana-ci-access-es-permanent@$GCLOUD_EMAIL_POSTFIX"
      ;;
    "kibana-so-types-snapshots")
      echo "kibana-ci-access-so-snapshots@$GCLOUD_EMAIL_POSTFIX"
      ;;
    "kibana-performance")
      echo "kibana-ci-access-perf-stats@$GCLOUD_EMAIL_POSTFIX"
      ;;
    "ci-artifacts.kibana.dev" | "kibana-ci-artifacts-"*)
      echo "kibana-ci-access-artifacts@$GCLOUD_EMAIL_POSTFIX"
      ;;
    "ci-typescript-archives")
      echo "kibana-ci-access-ts-archives@$GCLOUD_EMAIL_POSTFIX"
      ;;
    "kibana-ai-assistant-kb-artifacts-dev" | "kibana-ai-assistant-kb-artifacts")
      echo "kibana-ci-access-ai-buckets@$GCLOUD_EMAIL_POSTFIX"
      ;;
    "kibana-ci-access-chromium-blds")
      echo "kibana-ci-access-chromium-blds@$GCLOUD_EMAIL_POSTFIX"
      ;;
    *)
      echo "$bucket@$GCLOUD_EMAIL_POSTFIX"
      ;;
  esac
}

require_tools() {
  local tool
  for tool in gcloud buildkite-agent; do
    if [[ ! -x "$(command -v "$tool")" ]]; then
      fail "$tool is not installed, cannot activate a service account."
    fi
  done
}

fail() {
  echo "$1" >&2
  exit 1
}

main "$@"
