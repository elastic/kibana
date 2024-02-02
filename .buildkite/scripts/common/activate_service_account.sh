#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/vault_fns.sh

ARG0="${1:-}"

if [[ -z "$ARG0" ]]; then
  echo "Usage: $0 <bucket_name|email>"
  exit 1
elif [[ "$ARG0" == "-" ]]; then
  echo "Unsetting impersonation"
  gcloud config unset auth/impersonate_service_account
  exit 0
fi

GCLOUD_USER=$(gcloud auth list --filter="status=ACTIVE" --format="value(account)")
GCLOUD_EMAIL_POSTFIX="elastic-kibana-ci.iam.gserviceaccount.com"
GCLOUD_SA_PROXY_EMAIL="kibana-ci-sa-proxy@$GCLOUD_EMAIL_POSTFIX"


if [[ "$GCLOUD_USER" != "$GCLOUD_SA_PROXY_EMAIL" ]]; then
    if [[ -x "$(command -v gcloud)" ]]; then
      AUTH_RESULT=$(gcloud auth activate-service-account --key-file="$GOOGLE_APPLICATION_CREDENTIALS" || "FAILURE")
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
if [[ "$ARG0" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
  EMAIL="$ARG0"
elif [[ "$ARG0" =~ ^gs://* ]]; then
  BUCKET_NAME="${ARG0:5}"
else
  BUCKET_NAME="$ARG0"
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
    "headless_shell_staging")
      EMAIL="kibana-ci-access-chrome-builds@$GCLOUD_EMAIL_POSTFIX"
      ;;
    *)
      EMAIL="$BUCKET_NAME@$GCLOUD_EMAIL_POSTFIX"
      ;;
  esac
fi


echo "Impersonating $EMAIL"

# Activate the service account
gcloud config set auth/impersonate_service_account "$EMAIL"

echo "Activated service account $EMAIL"
