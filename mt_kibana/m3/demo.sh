#!/usr/bin/env bash
# Narrated M3 demo: shows, with evidence from both sides, that one Kibana process serves three projects through
# the Cloud Proxy and keeps them apart. Every claim is checked against Elasticsearch directly (kubectl exec), not
# only against what Kibana says. Safe to rerun: each run writes a fresh marker. DEMO_PAUSE=1 waits for Enter
# between steps, for presenting live.
set -uo pipefail

app_id=${APP_ID:-mtkb}
domain=eu-west-1.aws.dev.elastic.cloud
state=.es/mt/m3/projects-eck.json
ca=.es/mt/m3/proxy_ca.crt
kubectl -n ingress-proxy get secret ingress-proxy-regional-cert-follower -o jsonpath='{.data.ca\.crt}' | base64 -d >"$ca"
lb=$(kubectl -n ingress-proxy get svc ingress-proxy -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
ip=$(dig +short "$lb" | head -1)
tls_name=mt.$domain
marker=mt-demo-$(date +%H%M%S)
kibana_pod=$(kubectl -n mt-kibana get pod -l app.kubernetes.io/component=kibana -o jsonpath='{.items[0].metadata.name}')

failed=0
step() {
  echo
  echo "━━ $1"
  [ "${DEMO_PAUSE:-0}" = 1 ] && read -r -p "   (Enter) " _
}
show() { echo "   \$ $1"; }
check() { if [ "$2" = "$3" ]; then echo "   ✓ $1"; else echo "   ✗ $1 (expected $3, got $2)"; failed=1; fi; }
field() { jq -r --arg n "$1" ".[\$n].$2" "$state"; }
host_of() { echo "$(field "$1" id).$app_id.$domain"; }
via_proxy() {
  curl -sS --max-time 60 --cacert "$ca" --resolve "$tls_name:443:$ip" -H "Host: $1" "${@:3}" "https://$tls_name$2"
}
# kb <project> <path> [curl args...]: calls Kibana on that project's hostname, as that project's elastic user.
kb() { via_proxy "$(host_of "$1")" "$2" -u "elastic:$(field "$1" password)" -H 'kbn-xsrf: true' \
  -H 'x-elastic-internal-origin: kibana' "${@:3}"; }
# console <project> <method> <es-path> [curl args...]: an ES request made by Kibana's console proxy as the current user.
console() { kb "$1" "/api/console/proxy?method=$2&path=$(jq -rn --arg p "$3" '$p|@uri')" -X POST "${@:4}"; }
# es <project> <path>: asks that project's Elasticsearch directly, from inside its pod, bypassing Kibana and the proxy.
es() {
  local svc=mt-es-$1-es-http.mt-kibana.svc
  printf 'user = "elastic:%s"\n' "$(field "$1" password)" | kubectl -n mt-kibana exec -i "mt-es-$1-es-default-0" \
    -c elasticsearch -- curl -sS -K - --cacert /usr/share/elasticsearch/config/http-certs/ca.crt \
    --resolve "$svc:9200:127.0.0.1" "https://$svc:9200$2"
}

step "1. Topology: one Kibana pod, three Elasticsearch clusters, one proxy route per project"
show "kubectl -n mt-kibana get deploy/kibana; kubectl -n mt-kibana get elasticsearch"
{ kubectl -n mt-kibana get deploy/kibana; kubectl -n mt-kibana get elasticsearch; } | sed 's/^/   /'
show "kubectl -n mt-kibana get ingress  (project id → Service, read by the Cloud Proxy)"
kubectl -n mt-kibana get ingress -o json | jq -r '.items[].metadata.annotations |
  "   \(.["k8s.elastic.co/project-id"])  \(.["k8s.elastic.co/project-alias"])  → \(.["k8s.elastic.co/target-refs"])"'
show "kubectl -n mt-kibana get endpointslices -l kubernetes.io/service-name=kibana  (what the proxy sends to)"
endpoints=$(kubectl -n mt-kibana get endpointslices -l kubernetes.io/service-name=kibana -o json |
  jq -r '[.items[].endpoints[].targetRef.name] | join(" ")')
echo "   $endpoints"
check "the proxy route has exactly one backend, the Kibana pod" "$endpoints" "$kibana_pod"

step "2. Routing: each hostname reaches its own cluster"
for n in home a b; do
  want=$(es "$n" / | jq -r .cluster_uuid)
  got=$(kb "$n" '/api/stats?extended=true' | jq -r .cluster_uuid)
  echo "   $(host_of "$n")"
  echo "      Kibana /api/stats cluster_uuid: $got    ES mt-es-$n cluster_uuid: $want"
  check "mt-$n routed to mt-es-$n" "$got" "$want"
done

step "3. Data isolation: a document written through mt-a's hostname exists only in mt-es-a"
show "PUT /$marker/_doc/1 through Kibana's console, on $(host_of a)"
console a PUT "/$marker/_doc/1?refresh=true" -H 'Content-Type: application/json' -d '{"written_via":"mt-a"}' |
  jq -c '{_index, result}' | sed 's/^/   /'
for n in home a b; do
  count=$(es "$n" "/$marker/_count" | jq -r '.count // "no such index"')
  echo "   ES mt-es-$n: $marker docs → $count"
done
check "mt-es-a has the document" "$(es a "/$marker/_doc/1" | jq -r .found)" true
check "mt-es-b doesn't have the index" "$(es b "/$marker" | jq -r .status)" 404
check "mt-es-home doesn't have the index" "$(es home "/$marker" | jq -r .status)" 404
show "GET /$marker/_doc/1 through Kibana on each hostname"
for n in a b; do
  echo "   via mt-$n: $(console "$n" GET "/$marker/_doc/1" | jq -c '{found, error: .error.type}')"
done

step "4. Saved object isolation: a data view created in mt-a is invisible in mt-b"
show "POST /api/data_views/data_view on $(host_of a)"
kb a /api/data_views/data_view -X POST -H 'Content-Type: application/json' \
  -d "{\"data_view\":{\"title\":\"$marker*\",\"name\":\"$marker\"}}" | jq -c '{id: .data_view.id, name: .data_view.name}' |
  sed 's/^/   /'
for n in a b home; do
  count=$(kb "$n" /api/data_views | jq --arg m "$marker" '[.data_view[] | select(.name == $m)] | length')
  echo "   GET /api/data_views via mt-$n: $count match"
  [ "$n" = a ] && check "visible in mt-a" "$count" 1 || check "not visible in mt-$n" "$count" 0
done
check "stored in mt-es-a's .kibana* indices" "$(es a "/.kibana*/_count?q=index-pattern.name:%22$marker%22" | jq -r .count)" 1
check "not in mt-es-b's .kibana* indices" "$(es b "/.kibana*/_count?q=index-pattern.name:%22$marker%22" | jq -r .count)" 0

step "5. Kibana's own log: which tenant client made each call"
# Each query log entry is a header line naming the client's logger, then the request line.
show "kubectl -n mt-kibana logs $kibana_pod | <ES calls that mention $marker, with their client>"
calls=$(kubectl -n mt-kibana logs "$kibana_pod" --since=10m 2>/dev/null | awk -v m="$marker" '
  /\]\[elasticsearch\.query\./ { match($0, /elasticsearch\.query\.[^]]+/); client = substr($0, RSTART + 20, RLENGTH - 20); next }
  index($0, m) && client != "" { print client "  " substr($0, 1, 110); client = "" }')
echo "$calls" | head -8 | sed 's/^/   /'
a_client=tenant-$(field a id)
check "every logged call for $marker used mt-a's client ($a_client)" \
  "$(echo "$calls" | awk 'NF' | awk '{print $1}' | sort -u | tr -d '\n')" "$a_client"

step "6. Boundaries"
show "spoofed header: x-elastic-project-id: <mt-b's id> on mt-a's hostname"
got=$(kb a '/api/stats?extended=true' -H "x-elastic-project-id: $(field b id)" | jq -r .cluster_uuid)
check "the proxy overwrites it; still reaches mt-es-a" "$got" "$(field a cluster_uuid)"
show "mt-a's credentials on mt-b's hostname"
code=$(via_proxy "$(host_of b)" '/api/console/proxy?method=GET&path=/' -X POST -H 'kbn-xsrf: true' \
  -H 'x-elastic-internal-origin: kibana' -u "elastic:$(field a password)" -o /dev/null -w '%{http_code}')
check "rejected" "$code" 401
show "a project id with no route"
body=$(via_proxy "ffffffffffffffffffffffffffffffff.$app_id.$domain" /api/status)
echo "   $body"
check "the proxy answers, Kibana never sees it" "$(jq -r .message <<<"$body")" "Unknown resource."

echo
[ "$failed" = 0 ] && echo "All checks passed (marker $marker)." || echo "Some checks failed (marker $marker)."
exit "$failed"
