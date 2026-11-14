#!/usr/bin/env bash
# Creates, lists, or deletes the Elasticsearch projects used as M3 tenants. Each project's own Kibana runs
# KIBANA_IMAGE, so it initialises the project with the same code the multi-tenant Kibana runs.
# M3_ENV=devenv (default) uses the devenv's project-api; its key comes from devenv_api_key.sh. M3_ENV=qa uses QA.
# State, including the credentials returned at creation, goes to .es/mt/m3/projects-$M3_ENV.json (git ignores .es).
set -euo pipefail

cmd=${1:-}
env=${M3_ENV:-devenv}
key=$(jq -r ".api_key.$env" "$HOME/.elastic/cloud.json")
state=.es/mt/m3/projects-$env.json
names=(a b c)
mkdir -p "$(dirname "$state")"
[ -f "$state" ] || echo '{}' >"$state"
chmod 600 "$state"

curl_opts=()
if [ "$env" = devenv ]; then
  # The gateway's cert only names localhost, so connect to the load balancer as localhost and trust its CA.
  gw=$(kubectl -n global-gateway get svc -l gateway.envoyproxy.io/owning-gateway-name=global-gateway-user \
    -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}')
  kubectl -n global-gateway get secret global-gateway-user-cert -o jsonpath='{.data.ca\.crt}' | base64 -d >.es/mt/m3/gateway_ca.crt
  curl_opts=(--cacert .es/mt/m3/gateway_ca.crt --connect-to "localhost:443:$gw:443")
  api=https://localhost/api/v1/serverless/projects/elasticsearch
  region=local-k8s
else
  api=https://public-api.$env.cld.elstc.co/api/v1/serverless/projects/elasticsearch
  region=aws-eu-west-1
fi

call() {
  curl -sS --fail-with-body --max-time 60 ${curl_opts[@]+"${curl_opts[@]}"} -H "Authorization: ApiKey $key" \
    -H 'Content-Type: application/json' "$@"
}

case "$cmd" in
  create)
    : "${KIBANA_IMAGE:?set KIBANA_IMAGE, e.g. docker.elastic.co/kibana-ci/kibana-serverless-pr:pr-302955-<sha>}"
    for n in "${names[@]}"; do
      if [ "$(jq -r --arg n "$n" '.[$n].id // empty' "$state")" ]; then
        echo "mt-$n already exists"
        continue
      fi
      body=$(jq -n --arg name "mt-project-$n" --arg image "$KIBANA_IMAGE" --arg region "$region" \
        '{name: $name, region_id: $region, overrides: {kibana: {docker_image: $image}}}')
      res=$(call -XPOST "$api" -d "$body")
      jq --arg n "$n" --argjson res "$res" \
        '.[$n] = {id: $res.id, alias: $res.alias, es: $res.endpoints.elasticsearch, kibana: $res.endpoints.kibana,
          username: $res.credentials.username, password: $res.credentials.password}' "$state" >"$state.tmp"
      mv "$state.tmp" "$state"
      echo "created mt-$n: $(jq -r --arg n "$n" '.[$n].id' "$state")"
    done
    ;;
  status)
    for n in "${names[@]}"; do
      id=$(jq -r --arg n "$n" '.[$n].id // empty' "$state")
      [ -n "$id" ] || { echo "mt-$n: not created"; continue; }
      phase=$(call "$api/$id/status" | jq -r '.phase')
      image=$(call "$api/$id" | jq -r '.overrides.kibana.docker_image // "default"')
      echo "mt-$n $id phase=$phase kibana=$image"
    done
    ;;
  delete)
    for n in "${names[@]}"; do
      id=$(jq -r --arg n "$n" '.[$n].id // empty' "$state")
      [ -n "$id" ] || continue
      call -XDELETE "$api/$id" >/dev/null && echo "deleted mt-$n ($id)"
      jq --arg n "$n" 'del(.[$n])' "$state" >"$state.tmp" && mv "$state.tmp" "$state"
    done
    ;;
  *)
    echo "usage: $0 create|status|delete" >&2
    exit 1
    ;;
esac
