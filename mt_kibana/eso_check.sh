#!/usr/bin/env bash
# Checks that connectors (encrypted saved objects) created through a project run with that project's
# copy and secrets, and only write to that project's cluster.
set -uo pipefail

kbn() {
  local p=$1 method=$2 path=$3 body=${4:-}
  curl -s -u "elastic:changeme-$p" -H "x-elastic-project-id: project-$p" -H 'kbn-xsrf: true' \
    -H 'x-elastic-internal-origin: kibana' -H 'content-type: application/json' \
    -X "$method" "localhost:5601$path" ${body:+-d "$body"}
}

es() {
  local p=$1 method=$2 path=$3 body=${4:-} port=$((9200 + $(printf '%d' "'$1") - 97))
  curl -s -u "elastic:changeme-$p" -H 'content-type: application/json' \
    -X "$method" "localhost:$port$path" ${body:+-d "$body"}
}

count() { es "$1" GET "/$2/_count" "${3:-}" | jq -r '.count // 0'; }

failed=0
check() {
  if [ "$2" = "$3" ]; then
    echo "$1 PASS"
  else
    echo "$1 FAIL (want $3, got $2)"
    failed=1
  fi
}

index_connector() {
  kbn "$1" POST /api/actions/connector \
    '{"name":"mt-eso-check","connector_type_id":".index","config":{"index":"mt-m2-index","refresh":true}}' |
    jq -r .id
}
run() { kbn "$1" POST "/api/actions/connector/$2/_execute" "{\"params\":$3}" | jq -r '.status // .statusCode'; }

for p in a b c; do es "$p" DELETE /mt-m2-index,mt-m2-webhook?ignore_unavailable=true >/dev/null; done

b_index=$(index_connector b)
check "index connector runs in project-b" "$(run b "$b_index" '{"documents":[{"project":"project-b"}]}')" ok
check "index connector wrote to cluster B" "$(count b mt-m2-index)" 1
check "index connector did not write to cluster A" "$(count a mt-m2-index)" 0
check "project-a cannot run project-b's connector" \
  "$(run a "$b_index" '{"documents":[{"project":"project-a"}]}' | grep -qx ok && echo ran || echo refused)" refused

b_webhook=$(kbn b POST /api/actions/connector '{"name":"mt-eso-check-webhook","connector_type_id":".webhook",
  "config":{"url":"http://localhost:9201/mt-m2-webhook/_doc?refresh=true","method":"post","hasAuth":true,
    "authType":"webhook-authentication-basic","headers":{"content-type":"application/json"}},
  "secrets":{"user":"elastic","password":"changeme-b"}}' | jq -r .id)
check "webhook runs with its decrypted secret" "$(run b "$b_webhook" '{"body":"{\"project\":\"project-b\"}"}')" ok
check "webhook wrote to cluster B" "$(count b mt-m2-webhook)" 1

c_index=$(index_connector c)
for i in $(seq 20); do echo "b:$b_index" "c:$c_index"; done | xargs -n 1 -P 8 sh -c '
  p=${1%%:*}; id=${1#*:}
  curl -s -o /dev/null -u "elastic:changeme-$p" -H "x-elastic-project-id: project-$p" -H "kbn-xsrf: true" \
    -H "content-type: application/json" -X POST "localhost:5601/api/actions/connector/$id/_execute" \
    -d "{\"params\":{\"documents\":[{\"project\":\"project-$p\"}]}}"' _
others() { count "$1" mt-m2-index "{\"query\":{\"bool\":{\"must_not\":{\"term\":{\"project.keyword\":\"project-$1\"}}}}}"; }
check "parallel runs: cluster B has 21 project-b docs" "$(count b mt-m2-index)" 21
check "parallel runs: cluster C has 20 project-c docs" "$(count c mt-m2-index)" 20
check "parallel runs: no foreign docs in cluster B" "$(others b)" 0
check "parallel runs: no foreign docs in cluster C" "$(others c)" 0
check "parallel runs: nothing written to cluster A" "$(count a mt-m2-index)" 0

event_log() {
  count "$1" .kibana-event-log-ds "{\"query\":{\"nested\":{\"path\":\"kibana.saved_objects\",
    \"query\":{\"term\":{\"kibana.saved_objects.id\":\"$b_index\"}}}}}"
}
sleep 2
echo "info: event log entries for project-b's connector: cluster A=$(event_log a), cluster B=$(event_log b)"

kbn b DELETE "/api/actions/connector/$b_index" >/dev/null
kbn b DELETE "/api/actions/connector/$b_webhook" >/dev/null
kbn c DELETE "/api/actions/connector/$c_index" >/dev/null
for p in a b c; do es "$p" DELETE /mt-m2-index,mt-m2-webhook?ignore_unavailable=true >/dev/null; done

exit "$failed"
