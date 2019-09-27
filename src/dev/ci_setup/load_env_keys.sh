#!/usr/bin/env bash

set -e

# retry function
# -------------------------------------
# Retry a command for a specified number of times until the command exits successfully.
# Retry wait period backs off exponentially after each retry.
#
# The first argument should be the number of retries.
# Remainder is treated as the command to execute.
# -------------------------------------
function retry {
  local retries=$1
  shift

  local count=0
  until "$@"; do
    exit=$?
    wait=$((2 ** $count))
    count=$(($count + 1))
    if [ $count -lt $retries ]; then
      printf "Retry %s/%s exited %s, retrying in %s seconds...\n" "$count" "$retries" "$exit" "$wait" >&2
      sleep $wait
    else
      printf "Retry %s/%s exited %s, no more retries left.\n" "$count" "$retries" "$exit" >&2
      return $exit
    fi
  done
  return 0
}

if [ -z "$VAULT_SECRET_ID" ]; then
  if [ -n "$GITHUB_TOKEN" ] && [ -n "$KIBANA_CI_REPORTER_KEY" ] && [ -n "$PERCY_TOKEN" ]; then
    echo " -- secrets already loaded from vault";
  else
    echo ""
    echo ""
    echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~";
    echo "    VAULT_SECRET_ID not set, not loading tokens into env";
    echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~";
    echo ""
    echo ""
  fi
else
  set +x

  # export after define to avoid https://github.com/koalaman/shellcheck/wiki/SC2155
  VAULT_TOKEN=$(retry 5 vault write -field=token auth/approle/login role_id="$VAULT_ROLE_ID" secret_id="$VAULT_SECRET_ID")
  export VAULT_TOKEN

  # Set GITHUB_TOKEN for reporting test failures
  GITHUB_TOKEN=$(retry 5 vault read -field=github_token secret/kibana-issues/dev/kibanamachine)
  export GITHUB_TOKEN

  KIBANA_CI_REPORTER_KEY=$(retry 5 vault read -field=value secret/kibana-issues/dev/kibanamachine-reporter)
  export KIBANA_CI_REPORTER_KEY

  PERCY_TOKEN=$(retry 5 vault read -field=value secret/kibana-issues/dev/percy)
  export PERCY_TOKEN

  # remove vault related secrets
  unset VAULT_ROLE_ID VAULT_SECRET_ID VAULT_TOKEN VAULT_ADDR
fi
