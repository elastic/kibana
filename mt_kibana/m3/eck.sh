#!/usr/bin/env bash
# Creates or deletes the ECK Elasticsearch clusters used as M3 tenants, in the mt-kibana namespace.
# Each project gets a made-up 32-hex project id for its proxy route, and an elastic/kibana service-account token.
# State, including credentials, goes to .es/mt/m3/projects-eck.json (git ignores .es). CAs go next to it.
set -euo pipefail

cmd=${1:-}
dir=$(dirname "$0")
state=.es/mt/m3/projects-eck.json
names=(home a b)
mkdir -p "$(dirname "$state")"
[ -f "$state" ] || echo '{}' >"$state"
chmod 600 "$state"

# es_curl <name> <path> [curl args...]: calls that cluster's HTTP endpoint from inside its pod as elastic.
# The password goes over stdin, and TLS is verified against the cluster's own CA and service name.
es_curl() {
  local svc=mt-es-$1-es-http.mt-kibana.svc pw
  pw=$(kubectl -n mt-kibana get secret "mt-es-$1-es-elastic-user" -o jsonpath='{.data.elastic}' | base64 -d)
  printf 'user = "elastic:%s"\n' "$pw" | kubectl -n mt-kibana exec -i "mt-es-$1-es-default-0" -c elasticsearch -- \
    curl -sS --fail-with-body -K - --cacert /usr/share/elasticsearch/config/http-certs/ca.crt \
    --resolve "$svc:9200:127.0.0.1" "${@:3}" "https://$svc:9200$2"
}

case "$cmd" in
  create)
    yq 'select(.kind == "Namespace")' "$dir/kibana.yaml" | kubectl apply -f - | grep -v unchanged || true
    for n in "${names[@]}"; do
      sed "s|__NAME__|$n|g" "$dir/eck.yaml" | kubectl apply -f - | grep -v unchanged || true
    done
    for n in "${names[@]}"; do
      echo "waiting for mt-es-$n"
      kubectl -n mt-kibana wait "elasticsearch/mt-es-$n" --for=jsonpath='{.status.health}'=green --timeout=15m
    done

    for n in "${names[@]}"; do
      id=$(jq -r --arg n "$n" '.[$n].id // empty' "$state")
      [ -n "$id" ] || id=$(openssl rand -hex 16)
      kubectl -n mt-kibana get secret "mt-es-$n-es-http-certs-public" -o jsonpath='{.data.ca\.crt}' | base64 -d \
        >".es/mt/m3/eck_ca_$n.crt"
      # Recreate the token, because ES only returns its value at creation.
      es_curl "$n" /_security/service/elastic/kibana/credential/token/mt-kibana -X DELETE -o /dev/null 2>/dev/null || true
      token=$(es_curl "$n" /_security/service/elastic/kibana/credential/token/mt-kibana -X POST | jq -r .token.value)
      uuid=$(es_curl "$n" / | jq -r .cluster_uuid)
      password=$(kubectl -n mt-kibana get secret "mt-es-$n-es-elastic-user" -o jsonpath='{.data.elastic}' | base64 -d)
      jq --arg n "$n" --arg id "$id" --arg token "$token" --arg uuid "$uuid" --arg password "$password" \
        '.[$n] = (.[$n] // {}) + {id: $id, alias: "mt-kibana-m3-\($n)", es: "https://mt-es-\($n)-es-http.mt-kibana.svc:9200",
          username: "elastic", password: $password, serviceAccountToken: $token, cluster_uuid: $uuid}' \
        "$state" >"$state.tmp"
      mv "$state.tmp" "$state"
      echo "mt-$n: project id $id, cluster_uuid $uuid"
    done
    ;;
  delete)
    for n in "${names[@]}"; do
      kubectl -n mt-kibana delete elasticsearch "mt-es-$n" --ignore-not-found
    done
    rm -f "$state" .es/mt/m3/eck_ca_*.crt
    ;;
  *)
    echo "usage: $0 create|delete" >&2
    exit 1
    ;;
esac
