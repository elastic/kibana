#!/usr/bin/env bash

set -e

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
  # load shared helpers to get `retry` function
  source /usr/local/bin/bash_standard_lib.sh

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
