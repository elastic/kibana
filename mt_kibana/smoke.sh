#!/usr/bin/env bash
# Checks that Kibana answers each project's stats and console proxy calls from that project's cluster.
set -uo pipefail

failed=0
for p in a b c; do
  port=$((9200 + $(printf '%d' "'$p") - 97))
  want=$(curl -s -u "elastic:changeme-$p" "localhost:$port" | jq -r .cluster_uuid)
  got=$(curl -s -u "elastic:changeme-$p" -H "x-elastic-project-id: project-$p" \
    "localhost:5601/api/stats?extended=true" | jq -r .cluster_uuid)
  name=$(curl -s -u "elastic:changeme-$p" -H "x-elastic-project-id: project-$p" -H 'kbn-xsrf: true' \
    -H 'x-elastic-internal-origin: kibana' -X POST "localhost:5601/api/console/proxy?method=GET&path=/" |
    jq -r .cluster_name)
  if [ "$got" = "$want" ] && [ "$name" = "project-$p" ]; then
    echo "project-$p PASS"
  else
    echo "project-$p FAIL (cluster_uuid want=$want got=$got, cluster_name got=$name)"
    failed=1
  fi
done
exit "$failed"
