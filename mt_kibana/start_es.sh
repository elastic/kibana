#!/usr/bin/env bash
# Starts the local Elasticsearch cluster project-<a|b|c>. Run from the repo root, one terminal each.
set -euo pipefail

p=${1:-}
case "$p" in a | b | c) ;; *) echo "usage: $0 a|b|c" >&2; exit 1 ;; esac
port=$((9200 + $(printf '%d' "'$p") - 97))

ES_JAVA_OPTS="-Xms1g -Xmx1g" exec node scripts/es snapshot \
  --install-path "$PWD/.es/mt/es-$p" \
  --password "changeme-$p" \
  --port "$port" \
  -E transport.port=$((port + 100)) \
  -E cluster.name="project-$p" \
  -E discovery.type=single-node
