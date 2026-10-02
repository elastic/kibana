#!/bin/bash

VAULT_PATH_PREFIX="secret/ci/elastic-kibana"
VAULT_DEPLOYMENTS_PATH="kv/ci-shared/kibana-deployments"

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

vault_kv_get() {
  local kv_path=${1:-}
  local field=${2:-}

  if [[ -z "$field" || "$field" =~ ^-.* ]]; then
    retry 5 5 vault read "$kv_path" "${@:2}"
  else
    retry 5 5 vault read -field="$field" "$kv_path" "${@:3}"
  fi
}

set_deployment_credentials() {
  key_path=$1
  shift
  fields=("$@")

  retry 5 5 vault kv put "$VAULT_DEPLOYMENTS_PATH/$key_path" "${fields[@]}"
}

get_deployment_credentials() {
  key_path=$1
  field=$2

  retry 5 5 vault kv get -field="$field" "$VAULT_DEPLOYMENTS_PATH/$key_path"
}

unset_deployment_credentials() {
  key_path=$1

  retry 5 5 vault kv delete "$VAULT_DEPLOYMENTS_PATH/$key_path"
}

print_deployment_credentials_read() {
  key_path=$1

  echo "vault kv get -address=https://vault-ci-prod.elastic.dev $VAULT_DEPLOYMENTS_PATH/$key_path"
}
