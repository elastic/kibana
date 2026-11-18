#!/usr/bin/env bash
# Prints what each cluster holds after using Discover, read straight from Elasticsearch (not through Kibana).
# MT_ES_PORT matches the port passed to start_es.sh.
set -uo pipefail

es() {
  local p=$1 path=$2 body=${3:-}
  curl -s -u "elastic:changeme-$p" -H 'content-type: application/json' \
    "localhost:$((${MT_ES_PORT:-9200} + $(printf '%d' "'$p") - 97))$path" ${body:+-d "$body"}
}

# Saved objects of one type in the cluster's Kibana indices, as "title (id)".
objects() {
  es "$1" "/.kibana*/_search?expand_wildcards=all&size=100" "{\"query\":{\"term\":{\"type\":\"$2\"}}}" |
    jq -r --arg t "$2" '[.hits.hits[] | "\(._source[$t].title // ._source[$t].name // "?") (\(._id | sub("^[^:]*:"; "")))"] |
      if length == 0 then "none" else join(", ") end'
}

for p in a b c; do
  echo "== cluster $p (project-$p)"
  echo "  Discover sessions: $(objects "$p" search)"
  echo "  data views:        $(objects "$p" index-pattern)"
  es "$p" "/.kibana*/_search?expand_wildcards=all&size=10" '{"query":{"term":{"type":"config"}}}' |
    jq -r '.hits.hits[] | "  settings \(._id): defaultIndex=\(._source.config.defaultIndex // "unset"), other set keys: \(._source.config | with_entries(select(.value != null)) | keys - ["buildNum", "defaultIndex", "isDefaultIndexMigrated"] | join(",") | if . == "" then "none" else . end)"'
  echo "  sample web logs:   $(es "$p" /kibana_sample_data_logs/_count | jq -r 'if .count then "\(.count) docs" else "no index" end')"
  echo "  mt-a-orders:       $(es "$p" /mt-a-orders/_count | jq -r 'if .count then "\(.count) docs" else "no index" end')"
  echo "  search counter:    $(es "$p" /.kibana_analytics/_doc/search-telemetry:search-telemetry | jq -c '._source["search-telemetry"] // "none"')"
done
