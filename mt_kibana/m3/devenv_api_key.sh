#!/usr/bin/env bash
# Run this yourself: logs in to the DevShard's dev IAM and saves a Cloud API key as api_key.devenv in
# ~/.elastic/cloud.json, for projects.sh to create projects in the DevShard. Prompts for the password.
# The gateway's cert only names localhost, so curl connects to the load balancer as localhost and trusts its CA.
set -euo pipefail

email=${1:-user@elastic.co}
gw=$(kubectl -n global-gateway get svc -l gateway.envoyproxy.io/owning-gateway-name=global-gateway-user \
  -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}')
mkdir -p .es/mt/m3
kubectl -n global-gateway get secret global-gateway-user-cert -o jsonpath='{.data.ca\.crt}' | base64 -d >.es/mt/m3/gateway_ca.crt
tls=(--cacert .es/mt/m3/gateway_ca.crt --connect-to "localhost:443:$gw:443")
read -rs -p "DevShard dev-IAM password for $email: " pw
echo

token=$(jq -n --arg e "$email" --arg p "$pw" '{email: $e, password: $p}' |
  curl -sS "${tls[@]}" --fail-with-body https://localhost/api/v1/saas/auth/_login -H 'Content-Type: application/json' -d @- | jq -r .token)
key=$(curl -sS "${tls[@]}" --fail-with-body https://localhost/api/v1/users/auth/keys -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' -d '{"description":"mt-kibana-m3"}' | jq -r .key)
[ -n "$key" ] && [ "$key" != null ] || { echo "no key returned" >&2; exit 1; }

jq --arg k "$key" '.api_key.devenv = $k' "$HOME/.elastic/cloud.json" >"$HOME/.elastic/cloud.json.tmp"
mv "$HOME/.elastic/cloud.json.tmp" "$HOME/.elastic/cloud.json"
chmod 600 "$HOME/.elastic/cloud.json"
echo "saved api_key.devenv (gateway $gw)"
