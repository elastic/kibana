#!/usr/bin/env bash
# Checks the M3 path end to end with real serverless projects in a DevShard: each project's public Kibana hostname
# -> Cloud Proxy -> the one multi-tenant Kibana -> that project's Elasticsearch. Run after deploy_projects.sh.
# Needs the VPN. The hostnames are in public DNS, and TLS is verified against the shard's proxy certificate.
set -uo pipefail

domain=eu-west-1.aws.dev.elastic.cloud
state=.es/mt/m3/projects-devenv.json
ca=.es/mt/m3/shard.crt
kubectl -n ingress-proxy get secret ingress-proxy-regional-cert -o jsonpath='{.data.tls\.crt}' | base64 -d >"$ca"

failed=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1: $2"; failed=1; }
field() { jq -r --arg n "$1" ".[\$n].$2" "$state"; }
# call <url> <user-project-name> [curl args...]: calls the URL as that project's admin user. The password goes over stdin.
call() {
  printf 'user = "%s:%s"\n' "$(field "$2" username)" "$(field "$2" password)" |
    curl -sS --max-time 60 -K - --cacert "$ca" "${@:3}" "$1"
}
# kb <project-name> <user-project-name> <path> [curl args...]: calls Kibana on that project's public hostname.
kb() { call "$(field "$1" kibana)$3" "$2" "${@:4}"; }
console() { kb "$1" "$2" '/api/console/proxy?method=GET&path=/' -X POST -H 'kbn-xsrf: true' -H 'x-elastic-internal-origin: kibana' "${@:3}"; }

# One Kibana: one pod in mt-kibana, and no project runs its own UI Kibana.
pods=$(kubectl -n mt-kibana get pods -l app.kubernetes.io/component=kibana --field-selector=status.phase=Running -o name)
mt_uuid=$(kubectl -n mt-kibana exec "${pods%%$'\n'*}" -- cat /usr/share/kibana/data/uuid)
[ "$(wc -l <<<"$pods" | tr -d ' ')" = 1 ] && pass "one multi-tenant Kibana pod (uuid $mt_uuid)" || fail "Kibana pods" "$pods"

projects=$(jq -r 'keys[]' "$state")
for n in $projects; do
  id=$(field "$n" id)
  ui=$(kubectl -n "project-$id" get endpointslices -l kubernetes.io/service-name=kb-kb-http -o json | jq '[.items[].endpoints[]?] | length')
  [ "$ui" = 0 ] && pass "project-$n has no Kibana of its own in its route" || fail "project-$n own Kibana" "$ui endpoints"

  # Three Elasticsearch: each project's cluster, asked directly.
  want=$(call "$(field "$n" es)" "$n" | jq -r .cluster_uuid)
  name=$(call "$(field "$n" es)" "$n" | jq -r .cluster_name)
  [ "$name" = "$id" ] && pass "project-$n Elasticsearch is its own cluster ($want)" || fail "project-$n ES" "cluster_name=$name"

  # Every request on the project's hostname lands on the one Kibana, and reaches the project's cluster.
  uuids=$(for _ in 1 2 3 4 5; do kb "$n" "$n" /api/status | jq -r .uuid; done | sort -u)
  [ "$uuids" = "$mt_uuid" ] && pass "project-$n hostname served by the multi-tenant Kibana" || fail "project-$n Kibana" "$uuids"
  got=$(kb "$n" "$n" '/api/stats?extended=true' | jq -r .cluster_uuid)
  [ "$got" = "$want" ] && pass "project-$n internal user reaches its cluster" || fail "project-$n /api/stats" "want=$want got=$got"
  got=$(console "$n" "$n" | jq -r .cluster_uuid)
  [ "$got" = "$want" ] && pass "project-$n current user reaches its cluster" || fail "project-$n console proxy" "want=$want got=$got"
done

# The proxy overwrites a client-supplied project header with the project from the hostname.
got=$(kb a a '/api/stats?extended=true' -H "x-elastic-project-id: $(field b id)" | jq -r .cluster_uuid)
want=$(call "$(field a es)" a | jq -r .cluster_uuid)
[ "$got" = "$want" ] && pass "spoofed x-elastic-project-id is ignored" || fail "header spoofing" "got=$got"

# Credentials from one project don't work on another project's hostname.
code=$(console b a -o /dev/null -w '%{http_code}')
[ "$code" = 401 ] && pass "project-a credentials rejected on project-b" || fail "cross-project credentials" "HTTP $code"

# A project with no route never reaches Kibana. It has no DNS record, so connect to the proxy directly.
lb=$(kubectl -n ingress-proxy get svc ingress-proxy -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
code=$(curl -sS --max-time 30 --cacert "$ca" --connect-to "::$lb:443" -o /dev/null -w '%{http_code}' \
  "https://ffffffffffffffffffffffffffffffff.kb.$domain/api/status")
[ "$code" = 404 ] && pass "unknown project rejected by the proxy" || fail "unknown project" "HTTP $code"

exit "$failed"
