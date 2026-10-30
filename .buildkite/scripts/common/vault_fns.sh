#!/bin/bash

export LEGACY_VAULT_ADDR="https://secrets.elastic.co:8200"

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

  fullPath="secret/ci/elastic-kibana/$key_path"

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


  fullPath="secret/ci/elastic-kibana/$key_path"

  # shellcheck disable=SC2068
  retry 5 5 vault write "$fullPath" ${fields[@]}
}

# Readable only by the Buildkite pipelines granted on kv/ci-shared/kibana/pr-deploy/* in elastic/terrazzo
PR_DEPLOY_VAULT_PATH="kv/ci-shared/kibana/pr-deploy"

load_cloud_deploy_credentials() {
  EC_API_KEY="$(retry 5 5 vault kv get -field=api_key "$PR_DEPLOY_VAULT_PATH/cloud-deploy")"
  export EC_API_KEY
}

load_project_deploy_credentials() {
  PROJECT_API_KEY="$(retry 5 5 vault kv get -field=api_key "$PR_DEPLOY_VAULT_PATH/project-deploy")"
  export PROJECT_API_KEY
  PROJECT_API_DOMAIN="$(retry 5 5 vault kv get -field=domain "$PR_DEPLOY_VAULT_PATH/project-deploy")"
  export PROJECT_API_DOMAIN
}

# Prints a legacy Vault token; must run while VAULT_TOKEN is still the ci-prod token
legacy_vault_token() {
  local role_id secret_id
  role_id="$(retry 5 5 vault kv get -field=role_id "$PR_DEPLOY_VAULT_PATH/legacy-vault-approle")"
  secret_id="$(retry 5 5 vault kv get -field=secret_id "$PR_DEPLOY_VAULT_PATH/legacy-vault-approle")"
  VAULT_ADDR=$LEGACY_VAULT_ADDR vault write -field=token auth/approle/login role_id="$role_id" secret_id="$secret_id"
}

function set_in_legacy_vault() {
  key_path=$1
  shift
  fields=("$@")

  VAULT_TOKEN_BAK="$VAULT_TOKEN"

  # Make sure to either keep this variable name `VAULT_TOKEN` or unset `VAULT_TOKEN`,
  # otherwise the VM's default token will be used, that's connected to the ci-prod vault instance
  VAULT_TOKEN=$(legacy_vault_token)
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

  VAULT_TOKEN_BAK="$VAULT_TOKEN"

  # Make sure to either keep this variable name `VAULT_TOKEN` or unset `VAULT_TOKEN`,
  # otherwise the VM's default token will be used, that's connected to the ci-prod vault instance
  VAULT_TOKEN=$(legacy_vault_token)
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
