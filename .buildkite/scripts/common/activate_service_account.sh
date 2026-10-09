#!/usr/bin/env bash

set -euo pipefail

GCLOUD_EMAIL_POSTFIX="elastic-kibana-ci.iam.gserviceaccount.com"
GCLOUD_WIF_AUDIENCE="//iam.googleapis.com/projects/1003139005402/locations/global/workloadIdentityPools/buildkite/providers/buildkite"
GCP_OIDC_TOKEN_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/gcp_oidc_token.sh"

KIBANA_WIF_CREDENTIALS_DIR="${KIBANA_WIF_CREDENTIALS_DIR:-${TMPDIR:-/tmp}/kibana-wif-${BUILDKITE_JOB_ID:-local}}"
LOGGED_IN_ACCOUNTS_FILE="$KIBANA_WIF_CREDENTIALS_DIR/logged-in-accounts"

# access tokens live 60 minutes and can't be refreshed in place, so re-minting after 30 leaves every
# command at least 30 minutes. Single commands running longer than that need --auto-refresh.
ACCESS_TOKEN_MAX_AGE_MINUTES=30
TOKEN_EXCHANGE_ATTEMPTS=5

USAGE="Usage:
  $0 <bucket|gs://bucket>                  Share one access token per service account for the rest of the job
  $0 --auto-refresh <bucket|gs://bucket>   Let gcloud refresh credentials itself
  $0 --unset-impersonation                 Drop the active service account from the gcloud config
  $0 --logout-gcloud                             Also remove this job's credentials"

main() {
  local email
  case "${1:-}" in
    --unset-impersonation)
      clear_gcloud_auth_config
      ;;
    --logout-gcloud)
      logout_gcloud
      ;;
    --auto-refresh)
      [[ -n "${2:-}" ]] || fail "$USAGE"
      email="$(resolve_service_account "$2")" || exit 1
      activate_with_auto_refresh "$email"
      ;;
    "")
      fail "$USAGE"
      ;;
    *)
      email="$(resolve_service_account "$1")" || exit 1
      activate_with_shared_token "$email"
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
  local credentials_file
  credentials_file="$(credentials_file_for "$email")"

  require_tools
  write_wif_credentials_file "$email"
  if ! gcloud auth login --cred-file="$credentials_file" --quiet --no-user-output-enabled; then
    fail "Failed to activate service account $email."
  fi
  echo "$email" >> "$LOGGED_IN_ACCOUNTS_FILE"

  clear_gcloud_auth_config
  echo "Activated service account $email (auto-refresh)"
}

logout_gcloud() {
  local email
  clear_gcloud_auth_config
  if [[ -x "$(command -v gcloud)" && -s "$LOGGED_IN_ACCOUNTS_FILE" ]]; then
    while read -r email; do
      gcloud auth revoke "$email" --no-user-output-enabled
    done < <(sort -u "$LOGGED_IN_ACCOUNTS_FILE")
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

  write_wif_credentials_file "$email"
  for ((attempt = 1; attempt <= TOKEN_EXCHANGE_ATTEMPTS; attempt++)); do
    if error="$(print_access_token "$email" 2>&1 > "$partial_file")" && [[ -s "$partial_file" ]]; then
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
print_access_token() {
  local email="$1"
  CLOUDSDK_AUTH_ACCESS_TOKEN_FILE="" \
    CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE="$(credentials_file_for "$email")" \
    CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT="" \
    gcloud auth print-access-token --verbosity=error
}

# gcloud runs the executable to request a fresh Buildkite OIDC token whenever it needs one.
write_wif_credentials_file() {
  local email="$1"
  local credentials_file
  credentials_file="$(credentials_file_for "$email")"
  if [[ -s "$credentials_file" ]]; then
    return 0
  fi

  mkdir -p -m 700 "$KIBANA_WIF_CREDENTIALS_DIR"
  gcloud iam workload-identity-pools create-cred-config \
    "${GCLOUD_WIF_AUDIENCE#//iam.googleapis.com/}" \
    --service-account="$email" \
    --executable-command="\"$GCP_OIDC_TOKEN_SCRIPT\"" \
    --output-file="$credentials_file"
}

credentials_file_for() {
  echo "$KIBANA_WIF_CREDENTIALS_DIR/$1.credentials.json"
}

resolve_service_account() {
  local argument="$1"
  local bucket="${argument#gs://}"

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
    "ci-artifacts.kibana.dev")
      case "${BUILDKITE_PIPELINE_SLUG:-}" in
        "kibana-pull-request" | "kibana-storybooks-from-pr")
          echo "kibana-ci-access-published-pr@$GCLOUD_EMAIL_POSTFIX"
          ;;
        *)
          echo "kibana-ci-access-published@$GCLOUD_EMAIL_POSTFIX"
          ;;
      esac
      ;;
    "kibana-ci-artifacts-"*)
      echo "kibana-ci-access-artifacts@$GCLOUD_EMAIL_POSTFIX"
      ;;
    "ci-typescript-archives")
      if [[ "${BUILDKITE_PIPELINE_SLUG:-}" == "kibana-pull-request" ]]; then
        echo "kibana-ci-ts-archives-pr@$GCLOUD_EMAIL_POSTFIX"
      else
        echo "kibana-ci-access-ts-archives@$GCLOUD_EMAIL_POSTFIX"
      fi
      ;;
    "kibana-ai-assistant-kb-artifacts-dev" | "kibana-ai-assistant-kb-artifacts")
      echo "kibana-ci-access-ai-buckets@$GCLOUD_EMAIL_POSTFIX"
      ;;
    "kibana-ci-access-chromium-blds")
      echo "kibana-ci-access-chromium-blds@$GCLOUD_EMAIL_POSTFIX"
      ;;
    *)
      echo "No service account is configured for '${bucket}'." >&2
      return 1
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
