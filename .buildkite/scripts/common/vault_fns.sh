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

# Queues `vault_get <key_path> <field>` to be read into <var_name> by vault_await_all.
vault_get_async() {
  VAULT_ASYNC_READS+=("$1" "$2" "$3")
}

# Reads the queued values 6 at a time, exports them, and stops after a batch with a failure.
vault_await_all() {
  local dir n status failed=0 pids names value
  set -- "${VAULT_ASYNC_READS[@]}"
  unset VAULT_ASYNC_READS

  # /dev/shm is in memory, so the values don't touch disk. Without it, read them one at a time.
  if ! dir="$(mktemp -d -p /dev/shm 2>/dev/null)"; then
    while [[ $# -gt 0 ]]; do
      value="$(vault_get "$2" "$3")" || return
      declare -gx "$1=$value"
      shift 3
    done
    return 0
  fi

  while [[ $# -gt 0 && "$failed" == 0 ]]; do
    pids=()
    names=()
    while [[ $# -gt 0 && ${#pids[@]} -lt 6 ]]; do
      vault_get "$2" "$3" >"$dir/${#pids[@]}" &
      pids+=("$!")
      names+=("$1")
      shift 3
    done

    for n in "${!pids[@]}"; do
      if wait "${pids[n]}"; then
        declare -gx "${names[n]}=$(<"$dir/$n")"
      else
        status=$?
        echo "Failed to read ${names[n]} from Vault" >&2
        [[ "$failed" != 0 ]] || failed=$status
      fi
    done
  done

  rm -rf "$dir"
  return "$failed"
}

vault_set() {
  key_path=$1
  shift
  fields=("$@")


  fullPath="secret/ci/elastic-kibana/$key_path"

  # shellcheck disable=SC2068
  retry 5 5 vault write "$fullPath" ${fields[@]}
}

function set_in_legacy_vault() {
  key_path=$1
  shift
  fields=("$@")

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
