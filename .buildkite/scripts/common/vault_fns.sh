#!/bin/bash

# TODO: rewrite after https://github.com/elastic/kibana-operations/issues/15 is done
export LEGACY_VAULT_ADDR="https://secrets.elastic.co:8200"
if [[ "${VAULT_ADDR:-}" == "$LEGACY_VAULT_ADDR" ]]; then
  VAULT_PATH_PREFIX="secret/kibana-issues/dev"
  VAULT_KV_PREFIX="secret/kibana-issues/dev"
  IS_LEGACY_VAULT_ADDR=true
else
  VAULT_PATH_PREFIX="secret/ci/elastic-kibana"
  VAULT_KV_PREFIX="kv/ci-shared/kibana-deployments"
  IS_LEGACY_VAULT_ADDR=false
fi
export IS_LEGACY_VAULT_ADDR

retry() {
  local retries=$1; shift
  local delay=$1; shift
  local attempts=1

  until "$@"; do
    retry_exit_status=$?
    echo "Exited with $retry_exit_status" >&2
    if (( retries == "0" )); then
      return $retry_exit_status
    elif (( attempts == retries )); then
      echo "Failed $attempts retries" >&2
      return $retry_exit_status
    else
      echo "Retrying $((retries - attempts)) more times..." >&2
      attempts=$((attempts + 1))
      sleep "$delay"
    fi
  done
}

vault_get() {
  key_path=${1:-}
  field=${2:-}

  fullPath="$VAULT_PATH_PREFIX/$key_path"

  if [[ -z "$field" || "$field" =~ ^-.* ]]; then
    retry 5 5 vault read "$fullPath" "${@:2}"
  else
    retry 5 5 vault read -field="$field" "$fullPath" "${@:3}"
  fi
}

vault_set() {
  key_path=$1
  shift
  fields=("$@")


  fullPath="$VAULT_PATH_PREFIX/$key_path"

  # shellcheck disable=SC2068
  retry 5 5 vault write "$fullPath" ${fields[@]}
}

vault_kv_set() {
  kv_path=$1
  shift
  fields=("$@")

  vault kv put "$VAULT_KV_PREFIX/$kv_path" "${fields[@]}"
}

function get_vault_role_id() {
  if [[ "$IS_LEGACY_VAULT_ADDR" == "true" ]]; then
    VAULT_ROLE_ID="$(retry 5 15 gcloud secrets versions access latest --secret=kibana-buildkite-vault-role-id)"
  else
    VAULT_ROLE_ID="$(vault_get kibana-buildkite-vault-credentials role-id)"
  fi

  echo "$VAULT_ROLE_ID"
}

function get_vault_secret_id() {
    if [[ "$IS_LEGACY_VAULT_ADDR" == "true" ]]; then
      VAULT_SECRET_ID="$(retry 5 15 gcloud secrets versions access latest --secret=kibana-buildkite-vault-secret-id)"
    else
      VAULT_SECRET_ID="$(vault_get kibana-buildkite-vault-credentials secret-id)"
    fi

    echo "$VAULT_SECRET_ID"
}

function set_in_legacy_vault() {
  key_path=$1
  shift
  fields=("$@")

  VAULT_ROLE_ID="$(get_vault_role_id)"
  VAULT_SECRET_ID="$(get_vault_secret_id)"
  VAULT_TOKEN_BAK="$VAULT_TOKEN"

  # Make sure to either keep this variable name `VAULT_TOKEN` or unset `VAULT_TOKEN`,
  # otherwise the VM's default token will be used, that's connected to the ci-prod vault instance
  VAULT_TOKEN=$(VAULT_ADDR=$LEGACY_VAULT_ADDR vault write -field=token auth/approle/login role_id="$VAULT_ROLE_ID" secret_id="$VAULT_SECRET_ID")
  VAULT_ADDR=$LEGACY_VAULT_ADDR vault login -no-print "$VAULT_TOKEN"

  set +e
  # shellcheck disable=SC2068
  vault write -address=$LEGACY_VAULT_ADDR "secret/kibana-issues/dev/cloud-deploy/$key_path" ${fields[@]}
  EXIT_CODE=$?
  set -e

  VAULT_TOKEN="$VAULT_TOKEN_BAK"

  return $EXIT_CODE
}

function unset_in_legacy_vault() {
  key_path=$1

  VAULT_ROLE_ID="$(get_vault_role_id)"
  VAULT_SECRET_ID="$(get_vault_secret_id)"
  VAULT_TOKEN_BAK="$VAULT_TOKEN"

  # Make sure to either keep this variable name `VAULT_TOKEN` or unset `VAULT_TOKEN`,
  # otherwise the VM's default token will be used, that's connected to the ci-prod vault instance
  VAULT_TOKEN=$(VAULT_ADDR=$LEGACY_VAULT_ADDR vault write -field=token auth/approle/login role_id="$VAULT_ROLE_ID" secret_id="$VAULT_SECRET_ID")
  VAULT_ADDR=$LEGACY_VAULT_ADDR vault login -no-print "$VAULT_TOKEN"

  set +e
  vault delete -address=$LEGACY_VAULT_ADDR "secret/kibana-issues/dev/cloud-deploy/$key_path"
  EXIT_CODE=$?
  set -e

  VAULT_TOKEN="$VAULT_TOKEN_BAK"

  return $EXIT_CODE
}

function print_legacy_vault_read() {
  key_path=$1

  echo "vault read -address=$LEGACY_VAULT_ADDR secret/kibana-issues/dev/cloud-deploy/$key_path"
}
