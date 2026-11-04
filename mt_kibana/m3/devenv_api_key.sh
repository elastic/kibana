#!/usr/bin/env bash
# Run this yourself: logs in to the devenv's dev IAM and saves a Cloud API key as api_key.devenv in
# ~/.elastic/cloud.json, for projects.sh to create projects in the devenv. Prompts for the password.
# The gateway's cert only names localhost, so curl skips verification for this one dev-only endpoint.
set -euo pipefail

email=${1:-user@elastic.co}
gw=$(kubectl -n global-gateway get svc -l gateway.envoyproxy.io/owning-gateway-name=global-gateway-user \
  -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}')
read -rs -p "devenv dev-IAM password for $email: " pw
echo

token=$(jq -n --arg e "$email" --arg p "$pw" '{email: $e, password: $p}' |
  curl -sSk --fail-with-body "https://$gw/api/v1/saas/auth/_login" -H 'Content-Type: application/json' -d @- | jq -r .token)
key=$(curl -sSk --fail-with-body "https://$gw/api/v1/users/auth/keys" -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' -d '{"description":"mt-kibana-m3"}' | jq -r .key)
[ -n "$key" ] && [ "$key" != null ] || { echo "no key returned" >&2; exit 1; }

jq --arg k "$key" '.api_key.devenv = $k' "$HOME/.elastic/cloud.json" >"$HOME/.elastic/cloud.json.tmp"
mv "$HOME/.elastic/cloud.json.tmp" "$HOME/.elastic/cloud.json"
chmod 600 "$HOME/.elastic/cloud.json"
echo "saved api_key.devenv (gateway $gw)"
