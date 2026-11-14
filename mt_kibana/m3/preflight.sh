#!/usr/bin/env bash
# Checks every tool, login and permission the M3 run needs. Prints OK/FAIL per check and exits non-zero on any FAIL.
set -uo pipefail

ENV=${M3_ENV:-qa}
failed=0
ok() { printf 'OK    %s\n' "$1"; }
fail() { printf 'FAIL  %s: %s\n' "$1" "$2"; failed=1; }
check() { local name=$1 hint=$2; shift 2; if "$@" >/dev/null 2>&1; then ok "$name"; else fail "$name" "$hint"; fi; }

# Local toolchain
want_node=$(cat .nvmrc)
[ "$(node -v)" = "v$want_node" ] && ok "node $want_node" || fail "node" "run: nvm use (want $want_node, have $(node -v))"
for t in kubectl devctl tsh helm yq jq bk gh docker vault curl; do
  check "$t installed" "brew install $t" command -v "$t"
done
check "kibana bootstrap" "run: node scripts/kbn bootstrap" test -d node_modules/@kbn
check "docker daemon" "start Docker Desktop" docker info
check "docker.elastic.co login" "run: docker login docker.elastic.co" jq -e '.auths["docker.elastic.co"]' "$HOME/.docker/config.json"

# GitHub and Buildkite (custom image via ci:build-serverless-image)
check "gh auth" "run: gh auth login" gh auth status
check "gh push to elastic/kibana" "needs write access to label PRs" \
  sh -c '[ "$(gh api repos/elastic/kibana --jq .permissions.push)" = true ]'
check "bk auth" "run: bk auth login (token expired)" bk api '/pipelines?per_page=1'

# Cloud project API (create/delete ES projects)
key=$(jq -r ".api_key.$ENV // empty" "$HOME/.elastic/cloud.json" 2>/dev/null)
if [ -z "$key" ]; then
  fail "cloud api key ($ENV)" "add api_key.$ENV to ~/.elastic/cloud.json"
else
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -H "Authorization: ApiKey $key" \
    "https://public-api.$ENV.cld.elstc.co/api/v1/serverless/projects/elasticsearch")
  [ "$code" = 200 ] && ok "cloud api key ($ENV)" || fail "cloud api key ($ENV)" "HTTP $code"
fi

# VPN, Teleport and the dev env cluster
check "teleport reachable (VPN)" "connect Aviatrix VPN" \
  curl -s --max-time 10 -o /dev/null https://teleport-proxy.staging.getin.cloud:3080/webapi/ping
check "tsh session" "run: tsh login --proxy=teleport-proxy.staging.getin.cloud --auth=okta" tsh status
check "kube context reachable" "run: devctl update-kubeconfig <env>" kubectl version --request-timeout=10s
for verb in "create namespaces" "create deployments -A" "create services -A" "create secrets -A" "get secrets -A"; do
  check "kubectl can-i $verb" "ask for RBAC on the dev env" \
    sh -c "[ \"\$(kubectl auth can-i $verb --request-timeout=10s)\" = yes ]"
done
check "AppNetwork CRD" "multi-tenant routing needs it; check cluster type" \
  sh -c 'kubectl get crd --request-timeout=10s -o name | grep -qi appnetwork'

# Vault (only needed if credentials come from vault-ci)
if [ -n "${VAULT_ADDR:-}" ]; then
  check "vault token" "run: vault login -method=oidc" vault token lookup
else
  printf 'SKIP  vault (VAULT_ADDR not set)\n'
fi

exit "$failed"
