#!/usr/bin/env bash
# Checks that plain saved objects written through project-b stay in project-b's cluster.
set -uo pipefail

kbn() {
  local p=$1 method=$2 path=$3 body=${4:-}
  curl -s -u "elastic:changeme-$p" -H "x-elastic-project-id: project-$p" -H 'kbn-xsrf: true' \
    -H 'x-elastic-internal-origin: kibana' -H 'content-type: application/json' \
    -X "$method" "localhost:${MT_KBN_PORT:-5601}$path" ${body:+-d "$body"}
}

es_count() {
  local p=$1 doc_id=$2 port=$((${MT_ES_PORT:-9200} + $(printf '%d' "'$1") - 97))
  curl -s -u "elastic:changeme-$p" -H 'content-type: application/json' \
    "localhost:$port/.kibana*/_count?expand_wildcards=all" \
    -d "{\"query\":{\"ids\":{\"values\":[\"$doc_id\"]}}}" | jq -r .count
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

id=$(kbn b POST /api/data_views/data_view '{"data_view":{"title":"mt-so-check*","name":"mt-so-check"}}' |
  jq -r .data_view.id)
listed() { kbn "$1" GET /api/data_views | jq --arg id "$id" '[.data_view[] | select(.id == $id)] | length'; }
check "data view listed in project-b" "$(listed b)" 1
check "data view hidden from project-a" "$(listed a)" 0
check "data view stored in cluster B" "$(es_count b "index-pattern:$id")" 1
check "data view not stored in cluster A" "$(es_count a "index-pattern:$id")" 0
kbn b DELETE "/api/data_views/data_view/$id" >/dev/null

config_id="config:$(kbn a GET /api/status | jq -r .version.number)"
kbn b POST /api/kibana/settings '{"changes":{"csv:separator":";"}}' >/dev/null
separator() { kbn "$1" GET /api/kibana/settings | jq -r '.settings["csv:separator"].userValue // "unset"'; }
es_separator() {
  local port=$((${MT_ES_PORT:-9200} + $(printf '%d' "'$1") - 97))
  curl -s -u "elastic:changeme-$1" "localhost:$port/.kibana/_doc/$config_id" |
    jq -r '._source.config["csv:separator"] // "unset"'
}
check "setting changed in project-b" "$(separator b)" ";"
check "setting stored in cluster B" "$(es_separator b)" ";"
check "setting not stored in cluster A" "$(es_separator a)" unset
check "setting unchanged in project-a" "$(separator a)" unset
kbn b POST /api/kibana/settings '{"changes":{"csv:separator":null}}' >/dev/null

kbn b POST /api/spaces/space '{"id":"mt-so-check","name":"mt-so-check"}' >/dev/null
has_space() { kbn "$1" GET /api/spaces/space | jq '[.[] | select(.id == "mt-so-check")] | length'; }
check "space listed in project-b" "$(has_space b)" 1
check "space hidden from project-a" "$(has_space a)" 0
kbn b DELETE /api/spaces/space/mt-so-check >/dev/null

exit "$failed"
