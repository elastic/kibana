#!/usr/bin/env bash
# Shows which Elasticsearch client served each call Kibana made, from the JSON query log.
#   es_calls.sh watch [b|project-b] follow live calls made for browser or API requests (skips background tasks)
#   es_calls.sh check [since]    list home cluster calls made for a request that also used a tenant's cluster
# MT_HOME_TENANT names the tenant whose cluster is the home cluster (default project-a): its requests may use either client.
# Needs Kibana started with the logging config in the README (step 5), which writes .es/mt/es-queries.ndjson.
set -uo pipefail

log=${MT_ES_QUERY_LOG:-.es/mt/es-queries.ndjson}

# One line per call: time, client, Kibana request id, method and path.
calls() {
  jq -r --unbuffered '[."@timestamp"[11:23], (.log.logger | sub("^elasticsearch\\.query\\."; "")),
    .http.request.id, (.message | split("\n")[1] | .[0:140])] | @tsv'
}

case "${1:-}" in
  watch)
    # Background work has the request id "unknownId"; only requests from a browser or curl have a UUID.
    # "home" is the home cluster's client (logged as "data"); a tenant's client is "tenant-<id>".
    tenant=${2:-}
    case "$tenant" in a | b | c) tenant=project-$tenant ;; esac
    tail -n 0 -F "$log" | calls | awk -F'\t' -v t="$tenant" '
      $3 ~ /^unknownId/ { next }
      t != "" && $2 != "data" && $2 != "tenant-" t { next }
      { client = ($2 == "data" ? "HOME" : $2); printf "%s  %-18s %s  %s\n", $1, client, substr($3, 1, 8), $4; fflush() }'
    ;;
  check)
    since=${2:-1970-01-01T00:00:00}
    # A request's calls should all use one client. A request id seen on both a tenant's client and
    # the home client is a misrouted call.
    home=${MT_HOME_TENANT:-project-a}
    jq -r --arg since "$since" 'select(."@timestamp" >= $since and (.http.request.id | startswith("unknownId") | not))
      | [(.http.request.id | split(";")[0]), .log.logger, (.message | split("\n")[1] | .[0:140])] | @tsv' "$log" |
      awk -F'\t' -v home="elasticsearch.query.tenant-$home" '
        $2 == home { next }
        { n++; id[n] = $1; who[n] = $2; what[n] = $3; if ($2 ~ /tenant-/) tenant[$1] = $2 }
        END {
          for (i = 1; i <= n; i++) if (who[i] !~ /tenant-/ && (id[i] in tenant)) {
            bad++; printf "MISROUTED  request %s (%s) called home: %s\n", id[i], tenant[id[i]], what[i]
          }
          for (r in tenant) reqs++
          printf "%d tenant requests checked, %d home calls among them\n", reqs, bad + 0
          exit bad > 0
        }'
    ;;
  *)
    echo "usage: $0 watch [tenant] | check [since]" >&2
    exit 1
    ;;
esac
