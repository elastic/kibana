#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/vault_fns.sh"

BUCKET_OR_EMAIL="${1:-}"
GCLOUD_EMAIL_POSTFIX="elastic-kibana-ci.iam.gserviceaccount.com"
GCLOUD_SA_PROXY_EMAIL="kibana-ci-sa-proxy@$GCLOUD_EMAIL_POSTFIX"

if [[ -z "$BUCKET_OR_EMAIL" ]]; then
  echo "Usage: $0 <bucket_name|email>"
  exit 1
elif [[ "$BUCKET_OR_EMAIL" == "--unset-impersonation" ]]; then
  echo "Unsetting impersonation"
  gcloud config unset auth/impersonate_service_account
  exit 0
elif [[ "$BUCKET_OR_EMAIL" == "--logout-gcloud" ]]; then
  echo "Logging out of gcloud"
  if [[ -x "$(command -v gcloud)" ]] && [[ "$(gcloud auth list 2>/dev/null | grep $GCLOUD_SA_PROXY_EMAIL)" != "" ]]; then
    gcloud auth revoke $GCLOUD_SA_PROXY_EMAIL --no-user-output-enabled
  fi
  exit 0
fi

CURRENT_GCLOUD_USER=$(gcloud auth list --filter="status=ACTIVE" --format="value(account)")

# Verify that the service account proxy is activated
if [[ "$CURRENT_GCLOUD_USER" != "$GCLOUD_SA_PROXY_EMAIL" ]]; then
    if [[ -x "$(command -v gcloud)" ]]; then
      if [[ -z "${KIBANA_SERVICE_ACCOUNT_PROXY_KEY:-}" ]]; then
        echo "KIBANA_SERVICE_ACCOUNT_PROXY_KEY is not set, cannot activate service account $GCLOUD_SA_PROXY_EMAIL."
        exit 1
      fi

      AUTH_RESULT=$(gcloud auth activate-service-account --key-file="$KIBANA_SERVICE_ACCOUNT_PROXY_KEY" || "FAILURE")
      if [[ "$AUTH_RESULT" == "FAILURE" ]]; then
        echo "Failed to activate service account $GCLOUD_SA_PROXY_EMAIL."
        exit 1
      else
        echo "Activated service account $GCLOUD_SA_PROXY_EMAIL"
      fi
    else
      echo "gcloud is not installed, cannot activate service account $GCLOUD_SA_PROXY_EMAIL."
      exit 1
    fi
fi

# Check if the arg is a service account e-mail or a bucket name
EMAIL=""
if [[ "$BUCKET_OR_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
  EMAIL="$BUCKET_OR_EMAIL"
elif [[ "$BUCKET_OR_EMAIL" =~ ^gs://* ]]; then
  BUCKET_NAME="${BUCKET_OR_EMAIL:5}"
else
  BUCKET_NAME="$BUCKET_OR_EMAIL"
fi

if [[ -z "$EMAIL" ]]; then
  case "$BUCKET_NAME" in
    "elastic-kibana-coverage-live")
      EMAIL="kibana-ci-access-coverage@$GCLOUD_EMAIL_POSTFIX"
      ;;
    "kibana-ci-es-snapshots-daily")
      EMAIL="kibana-ci-access-es-snapshots@$GCLOUD_EMAIL_POSTFIX"
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
    *)
      EMAIL="$BUCKET_NAME@$GCLOUD_EMAIL_POSTFIX"
      ;;
  esac
fi

# Activate the service account
echo "Impersonating $EMAIL"
gcloud config set auth/impersonate_service_account "$EMAIL"
echo "Activated service account $EMAIL"
