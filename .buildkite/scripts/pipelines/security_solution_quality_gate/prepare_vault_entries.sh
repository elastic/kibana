#!/bin/bash

mkdir .ftr

# The role-users file  that is used as a fallback if the proxy service is unavailable.
vault_get security-quality-gate/role-users data -format=json > .ftr/role_users.json
# The role-users files relevant to the proxy service and its orgs.
vault_get security-quality-gate/role-users/sec-sol-auto-01 data -format=json > .ftr/sec-sol-auto-01.json
vault_get security-quality-gate/role-users/sec-sol-auto-02 data -format=json > .ftr/sec-sol-auto-02.json
vault_get security-quality-gate/role-users/sec-sol-auto-03 data -format=json > .ftr/sec-sol-auto-03.json

# The vault entries relevant to QA Cloud
export CLOUD_QA_API_KEY=$(vault_get security-solution-quality-gate qa_api_key)
export QA_CONSOLE_URL=$(vault_get security-solution-quality-gate qa_console_url)
# The vault entries relevant to the Proxy service (Cloud Handler)
export PROXY_URL=$(vault_get security-solution-quality-gate-proxy proxy_url_prod)
export PROXY_CLIENT_ID=$(vault_get security-solution-quality-gate-proxy client_id)
export PROXY_SECRET=$(vault_get security-solution-quality-gate-proxy secret)
