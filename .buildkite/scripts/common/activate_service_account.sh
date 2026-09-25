#!/usr/bin/env bash

set -euo pipefail

CALL_ARGUMENT="${1:-}"
GCLOUD_EMAIL_POSTFIX="elastic-kibana-ci.iam.gserviceaccount.com"
GCLOUD_SA_PROXY_EMAIL="kibana-ci-sa-proxy@$GCLOUD_EMAIL_POSTFIX"
GCLOUD_WIF_AUDIENCE="//iam.googleapis.com/projects/1003139005402/locations/global/workloadIdentityPools/buildkite/providers/buildkite"

KIBANA_WIF_CREDENTIALS_DIR="${KIBANA_WIF_CREDENTIALS_DIR:-${TMPDIR:-/tmp}/kibana-wif-${BUILDKITE_JOB_ID:-local}}"
WIF_CREDENTIALS_FILE="$KIBANA_WIF_CREDENTIALS_DIR/credentials.json"

if [[ -z "$CALL_ARGUMENT" ]]; then
  echo "Usage: $0 <bucket_name|email>"
  exit 1
elif [[ "$CALL_ARGUMENT" == "--unset-impersonation" ]]; then
  echo "Unsetting impersonation"
  if [[ -x "$(command -v gcloud)" ]]; then
    gcloud config unset auth/impersonate_service_account
  fi
  exit 0
elif [[ "$CALL_ARGUMENT" == "--logout-gcloud" ]]; then
  echo "Logging out of gcloud"
  if [[ -x "$(command -v gcloud)" ]] && [[ "$(gcloud auth list 2>/dev/null | grep $GCLOUD_SA_PROXY_EMAIL)" != "" ]]; then
    gcloud auth revoke $GCLOUD_SA_PROXY_EMAIL --no-user-output-enabled
  fi
  rm -rf "$KIBANA_WIF_CREDENTIALS_DIR"
  exit 0
fi

if [[ ! -x "$(command -v gcloud)" ]]; then
  echo "gcloud is not installed, cannot activate service account $GCLOUD_SA_PROXY_EMAIL."
  exit 1
fi
if [[ ! -x "$(command -v buildkite-agent)" ]]; then
  echo "buildkite-agent is not installed, cannot activate service account $GCLOUD_SA_PROXY_EMAIL."
  exit 1
fi

GCP_OIDC_TOKEN_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/gcp_oidc_token.sh"
mkdir -p "$KIBANA_WIF_CREDENTIALS_DIR"

# Request a fresh Buildkite token whenever gcloud refreshes its credentials.
gcloud iam workload-identity-pools create-cred-config \
  "${GCLOUD_WIF_AUDIENCE#//iam.googleapis.com/}" \
  --service-account="$GCLOUD_SA_PROXY_EMAIL" \
  --executable-command="\"$GCP_OIDC_TOKEN_SCRIPT\"" \
  --output-file="$WIF_CREDENTIALS_FILE"

if ! gcloud auth login --cred-file="$WIF_CREDENTIALS_FILE" --quiet --no-user-output-enabled; then
  echo "Failed to activate service account $GCLOUD_SA_PROXY_EMAIL."
  exit 1
fi
echo "Activated service account $GCLOUD_SA_PROXY_EMAIL"

# Check if the arg is a service account e-mail or a bucket name
EMAIL=""
if [[ "$CALL_ARGUMENT" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
  EMAIL="$CALL_ARGUMENT"
elif [[ "$CALL_ARGUMENT" =~ ^gs://* ]]; then
  BUCKET_NAME="${CALL_ARGUMENT:5}"
else
  BUCKET_NAME="$CALL_ARGUMENT"
fi

if [[ -z "$EMAIL" ]]; then
  case "$BUCKET_NAME" in
    "elastic-kibana-coverage-live")
      EMAIL="kibana-ci-access-coverage@$GCLOUD_EMAIL_POSTFIX"
      ;;
    "kibana-ci-es-snapshots-daily")
      EMAIL="kibana-ci-access-es-daily@$GCLOUD_EMAIL_POSTFIX"
      ;;
    "kibana-ci-es-snapshots-permanent")
      EMAIL="kibana-ci-access-es-permanent@$GCLOUD_EMAIL_POSTFIX"
      ;;
    "kibana-so-types-snapshots")
      EMAIL="kibana-ci-access-so-snapshots@$GCLOUD_EMAIL_POSTFIX"
      ;;
    "kibana-performance")
      EMAIL="kibana-ci-access-perf-stats@$GCLOUD_EMAIL_POSTFIX"
      ;;
    "ci-artifacts.kibana.dev")
      EMAIL="kibana-ci-access-artifacts@$GCLOUD_EMAIL_POSTFIX"
      ;;
    "ci-typescript-archives")
      EMAIL="kibana-ci-access-ts-archives@$GCLOUD_EMAIL_POSTFIX"
      ;;
    "kibana-ai-assistant-kb-artifacts-dev" | "kibana-ai-assistant-kb-artifacts")
      EMAIL="kibana-ci-access-ai-buckets@$GCLOUD_EMAIL_POSTFIX"
      ;;
    "kibana-ci-access-chromium-blds")
      EMAIL="kibana-ci-access-chromium-blds@$GCLOUD_EMAIL_POSTFIX"
      ;;
    "kibana-ci-artifacts-"*)
      EMAIL="kibana-ci-access-artifacts@$GCLOUD_EMAIL_POSTFIX"
      ;;
    *)
      EMAIL="$BUCKET_NAME@$GCLOUD_EMAIL_POSTFIX"
      ;;
  esac
fi

# Activate the service account
echo "Impersonating $EMAIL"
gcloud config set auth/impersonate_service_account "$EMAIL"
echo "Activated service account $EMAIL"
