#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/vault_fns.sh"

ACCOUNT_NAME="${1:-}"

if [[ -z "$ACCOUNT_NAME" ]]; then
  echo "Usage: $0 <service-account-name-or-id>"
  exit 1
fi

case "$ACCOUNT_NAME" in
  "coverage")
    SERVICE_ACCOUNT_ID="kibana-ci-access-coverage"
    ;;
  "so-snapshots")
    SERVICE_ACCOUNT_ID="kibana-ci-access-so-snapshots"
    ;;
  "es-snapshots")
    SERVICE_ACCOUNT_ID="kibana-ci-access-es-snapshots"
    ;;
  "perf-stats")
    SERVICE_ACCOUNT_ID="kibana-ci-access-perf-stats"
    ;;
  "artifacts")
    SERVICE_ACCOUNT_ID="kibana-ci-access-artifacts"
    ;;
  "chrome-builds")
    SERVICE_ACCOUNT_ID="kibana-ci-access-chrome-builds"
    ;;
  *)
    SERVICE_ACCOUNT_ID="$ACCOUNT_NAME"
    ;;
esac

echo "Getting key for $SERVICE_ACCOUNT_ID"
KEY="$(vault_get "service-accounts/$SERVICE_ACCOUNT_ID" "key" | base64 -d)"
gcloud auth activate-service-account "${SERVICE_ACCOUNT_ID}@elastic-kibana-ci.iam.gserviceaccount.com" --key-file <(echo "$KEY")

echo "Activated service account $SERVICE_ACCOUNT_ID / $SERVICE_ACCOUNT_ID"
