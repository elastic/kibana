#!/usr/bin/env bash
# Checks the M3 path end to end: client hostname -> Cloud Proxy -> multi-tenant Kibana -> that project's Elasticsearch.
# Needs the VPN. Calls the proxy load balancer directly (no public DNS for these names) and trusts the proxy's CA.
# The proxy routes on the Host header, so TLS is verified against a name its wildcard cert covers
# (mt.<domain>) while Host carries <project-id>.<app>.<domain>, which is one label too deep for the wildcard.
set -uo pipefail

app_id=${APP_ID:-mtkb}
domain=eu-west-1.aws.dev.elastic.cloud
state=.es/mt/m3/projects-eck.json
ca=.es/mt/m3/proxy_ca.crt
kubectl -n ingress-proxy get secret ingress-proxy-regional-cert-follower -o jsonpath='{.data.ca\.crt}' | base64 -d >"$ca"
lb=$(kubectl -n ingress-proxy get svc ingress-proxy -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
ip=$(dig +short "$lb" | head -1)
tls_name=mt.$domain

failed=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1: $2"; failed=1; }
field() { jq -r --arg n "$1" ".[\$n].$2" "$state"; }
# via_proxy <host> <path> [curl args...]: sends a request through the proxy for that hostname.
via_proxy() {
  curl -sS --max-time 60 --cacert "$ca" --resolve "$tls_name:443:$ip" -H "Host: $1" "${@:3}" "https://$tls_name$2"
}
# kb <project-name> <user-project-name> <path> [curl args...]: calls Kibana on that project's hostname as that user.
kb() {
  via_proxy "$(field "$1" id).$app_id.$domain" "$3" -u "$(field "$2" username):$(field "$2" password)" "${@:4}"
}
# es_uuid <project-name>: the project's cluster_uuid, which eck.sh read from the cluster itself.
es_uuid() { field "$1" cluster_uuid; }

projects=$(jq -r 'keys[]' "$state")
for n in $projects; do
  want=$(es_uuid "$n")
  got=$(kb "$n" "$n" '/api/stats?extended=true' | jq -r .cluster_uuid)
  [ "$got" = "$want" ] && pass "mt-$n internal user reaches its cluster" || fail "mt-$n /api/stats" "want=$want got=$got"

  got=$(kb "$n" "$n" '/api/console/proxy?method=GET&path=/' -X POST -H 'kbn-xsrf: true' \
    -H 'x-elastic-internal-origin: kibana' | jq -r .cluster_uuid)
  [ "$got" = "$want" ] && pass "mt-$n current user reaches its cluster" || fail "mt-$n console proxy" "want=$want got=$got"
done

# The proxy overwrites a client-supplied project header with the project from the hostname.
a_uuid=$(es_uuid a)
got=$(kb a a '/api/stats?extended=true' -H "x-elastic-project-id: $(field b id)" | jq -r .cluster_uuid)
[ "$got" = "$a_uuid" ] && pass "spoofed x-elastic-project-id is ignored" || fail "header spoofing" "got=$got"

# Credentials from one project don't work on another project's hostname.
code=$(kb b a '/api/console/proxy?method=GET&path=/' -X POST -H 'kbn-xsrf: true' \
  -H 'x-elastic-internal-origin: kibana' -o /dev/null -w '%{http_code}')
[ "$code" = 401 ] && pass "mt-a credentials rejected on mt-b" || fail "cross-project credentials" "HTTP $code"

# A project with no route never reaches Kibana.
code=$(via_proxy "ffffffffffffffffffffffffffffffff.$app_id.$domain" /api/status -o /dev/null -w '%{http_code}')
[ "$code" = 404 ] && pass "unknown project rejected by the proxy" || fail "unknown project" "HTTP $code"

exit "$failed"
