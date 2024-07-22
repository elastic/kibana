#!/bin/bash
mkdir .ftr

if [ -z "${ENVIRONMENT}" ] || [ "${ENVIRONMENT}" = "prod" ]; then
  # If not set, define the environment variable ENVIRONMENT
  vault_get security-quality-gate/role-users-prod/sec-sol-auto-01 data -format=json > .ftr/role_users.json
  # The vault entries relevant to Cloud PROD
  export CLOUD_API_KEY=$(vault_get security-solution-quality-gate prod_api_key)
  export CONSOLE_URL=$(vault_get security-solution-quality-gate prod_console_url)
else
  # The role-users file  that is used as a fallback if the proxy service is unavailable.
  vault_get security-quality-gate/role-users data -format=json > .ftr/role_users.json
  # The role-users files relevant to the proxy service and its orgs.
  vault_get security-quality-gate/role-users/sec-sol-auto-01 data -format=json > .ftr/sec-sol-auto-01.json
  vault_get security-quality-gate/role-users/sec-sol-auto-02 data -format=json > .ftr/sec-sol-auto-02.json
  vault_get security-quality-gate/role-users/sec-sol-auto-03 data -format=json > .ftr/sec-sol-auto-03.json
  vault_get security-quality-gate/role-users/sec-sol-auto-04 data -format=json > .ftr/sec-sol-auto-04.json
  vault_get security-quality-gate/role-users/sec-sol-auto-05 data -format=json > .ftr/sec-sol-auto-05.json
  vault_get security-quality-gate/role-users/sec-sol-auto-06 data -format=json > .ftr/sec-sol-auto-06.json
  vault_get security-quality-gate/role-users/sec-sol-auto-07 data -format=json > .ftr/sec-sol-auto-07.json
  vault_get security-quality-gate/role-users/sec-sol-auto-08 data -format=json > .ftr/sec-sol-auto-08.json
  vault_get security-quality-gate/role-users/sec-sol-auto-09 data -format=json > .ftr/sec-sol-auto-09.json
  vault_get security-quality-gate/role-users/sec-sol-auto-10 data -format=json > .ftr/sec-sol-auto-10.json
  # The vault entries relevant to QA Cloud
  export CLOUD_API_KEY=$(vault_get security-solution-quality-gate qa_api_key)
  export CONSOLE_URL=$(vault_get security-solution-quality-gate qa_console_url)
fi

# The vault entries relevant to the Proxy service (Cloud Handler)
export PROXY_URL=$(vault_get security-solution-quality-gate-proxy proxy_url_prod)
export PROXY_CLIENT_ID=$(vault_get security-solution-quality-gate-proxy client_id)
export PROXY_SECRET=$(vault_get security-solution-quality-gate-proxy secret)
