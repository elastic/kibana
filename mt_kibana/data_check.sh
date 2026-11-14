#!/usr/bin/env bash
# Checks that data views and data plugin searches through project-b only see cluster B (M5).
# MT_ES_PORT and MT_KBN_PORT match the ports passed to start_es.sh and Kibana.
set -uo pipefail

es_port() { echo $((${MT_ES_PORT:-9200} + $(printf '%d' "'$1") - 97)); }

kbn() {
  local p=$1 method=$2 path=$3 body=${4:-}
  local version=()
  # Internal routes are versioned 1, public ones default to their oldest date version.
  case "$path" in /internal/*) version=(-H 'elastic-api-version: 1') ;; esac
  curl -s -u "elastic:changeme-$p" -H "x-elastic-project-id: project-$p" -H 'kbn-xsrf: true' \
    -H 'x-elastic-internal-origin: kibana' ${version[@]+"${version[@]}"} -H 'content-type: application/json' \
    -X "$method" "localhost:${MT_KBN_PORT:-5601}$path" ${body:+-d "$body"}
}

es() {
  local p=$1 method=$2 path=$3 body=${4:-}
  curl -s -u "elastic:changeme-$p" -H 'content-type: application/json' \
    -X "$method" "localhost:$(es_port "$p")$path" ${body:+-d "$body"}
}

failed=0
check() {
  if [ "$2" = "$3" ]; then
    echo "$1 PASS"
  else
    echo "$1 FAIL (want $3, got $2)"
    failed=1
  fi
}

# Each cluster gets the same index name with its own documents and one field only it has.
index=mt-m5-logs
for p in a b; do
  es "$p" DELETE "/$index" >/dev/null
  es "$p" POST "/$index/_doc?refresh=true" \
    "{\"@timestamp\":\"2026-11-05T00:00:00Z\",\"tenant\":\"project-$p\",\"only_in_$p\":1}" >/dev/null
done
es b POST "/$index/_doc?refresh=true" '{"@timestamp":"2026-11-05T00:01:00Z","tenant":"project-b","only_in_b":2}' >/dev/null

# Data views: field lists come from the tenant's own mappings.
fields() { kbn "$1" GET "/internal/data_views/_fields_for_wildcard?pattern=$index" | jq -r '[.fields[].name] | join(",")'; }
check "fields for project-b have only_in_b" "$(fields b | tr , '\n' | grep -c '^only_in_b$')" 1
check "fields for project-b lack only_in_a" "$(fields b | tr , '\n' | grep -c '^only_in_a$')" 0

id=$(kbn b POST /api/data_views/data_view "{\"data_view\":{\"title\":\"$index\",\"name\":\"$index\"}}" | jq -r .data_view.id)
dv_fields() { kbn b GET "/api/data_views/data_view/$id" | jq -r '.data_view.fields | keys | join(",")'; }
check "data view in project-b has only_in_b" "$(dv_fields | tr , '\n' | grep -c '^only_in_b$')" 1

# Search strategies: each one runs on the tenant's cluster.
search() {
  local p=$1 strategy=$2
  kbn "$p" POST "/internal/search/$strategy" \
    "{\"params\":{\"index\":\"$index\",\"body\":{\"query\":{\"match_all\":{}}}}}" |
    jq -r '[.rawResponse.hits.hits[]._source.tenant] | unique | join(",")'
}
check "es search through project-b" "$(search b es)" project-b
check "ese search through project-b" "$(search b ese)" project-b
check "ese search through project-a" "$(search a ese)" project-a

esql() {
  kbn "$1" POST /internal/search/esql "{\"params\":{\"query\":\"FROM $index | STATS c = COUNT(*)\"}}" |
    jq -r '.rawResponse.values[0][0]'
}
check "ES|QL count through project-b" "$(esql b)" 2
check "ES|QL count through project-a" "$(esql a)" 1

# KQL value suggestions read the tenant's terms.
suggest() {
  kbn "$1" POST "/internal/kibana/suggestions/values/$index" '{"query":"","field":"tenant.keyword","method":"terms_agg"}' |
    jq -r 'join(",")'
}
check "value suggestions through project-b" "$(suggest b)" project-b

# The default data view is an advanced setting, so it is stored per tenant and must be read per tenant.
kbn b POST /api/data_views/default "{\"data_view_id\":\"$id\",\"force\":true}" >/dev/null
default_id() { kbn "$1" GET /api/data_views/default | jq -r '.data_view_id // ""'; }
check "default data view not set in project-a" "$([ "$(default_id a)" = "$id" ] && echo "$id" || echo other)" other
check "default data view set in project-b" "$(default_id b)" "$id"
kbn b POST /api/data_views/default '{"data_view_id":null,"force":true}' >/dev/null
kbn b DELETE "/api/data_views/data_view/$id" >/dev/null

# KQL opt-in telemetry is a counter saved object written by the internal user.
kql_count() {
  es "$1" POST '/.kibana*/_search?expand_wildcards=all' '{"query":{"ids":{"values":["kql-telemetry:kql-telemetry"]}}}' |
    jq -r '.hits.hits[0]._source["kql-telemetry"].optInCount // 0'
}
before_a=$(kql_count a) before_b=$(kql_count b)
kbn b POST /internal/kql_opt_in_stats '{"opt_in":true}' >/dev/null
sleep 1
check "KQL opt-in counted in cluster B" "$(($(kql_count b) - before_b))" 1
check "KQL opt-in not counted in cluster A" "$(($(kql_count a) - before_a))" 0

for p in a b; do es "$p" DELETE "/$index" >/dev/null; done
exit "$failed"
