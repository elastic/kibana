#!/usr/bin/env bash
# Boots single-tenant Kibana against project-<a|b|c> until it is available, then stops it.
# This creates the .kibana* indices and registers Kibana's privileges on that cluster.
# MT_ES_PORT and MT_KBN_PORT match the ports passed to start_es.sh and the multi-tenant Kibana.
set -euo pipefail

p=${1:-}
case "$p" in a | b | c) ;; *) echo "usage: $0 a|b|c" >&2; exit 1 ;; esac
port=$((${MT_ES_PORT:-9200} + $(printf '%d' "'$p") - 97))
key=$(printf "$p%.0s" $(seq 32))
log=".es/mt/init-$p.log"
mkdir -p .es/mt

node scripts/kibana --dev --no-base-path --no-optimizer \
  --elasticsearch.hosts="http://localhost:$port" --elasticsearch.password="changeme-$p" \
  --xpack.encryptedSavedObjects.encryptionKey="$key" --server.port="${MT_KBN_PORT:-5601}" >"$log" 2>&1 &
kibana=$!
trap 'kill -INT "$kibana" 2>/dev/null; wait "$kibana" 2>/dev/null || true' EXIT

echo "Initialising project-$p (log: $log)"
until grep -q 'Kibana is now available' "$log"; do
  if ! kill -0 "$kibana" 2>/dev/null; then
    echo "Kibana exited before it was available, see $log" >&2
    exit 1
  fi
  sleep 5
done
echo "project-$p is initialised"
