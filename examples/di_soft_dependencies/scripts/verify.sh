#!/usr/bin/env bash
# Boots Kibana with --run-examples, checks the five DI soft-dependency example plugins on the
# server (HTTP routes) and in the browser (window.__diSoftDeps), then shuts Kibana down.
# Usage: verify.sh <both|a_off|b_off> [outDir]
set -uo pipefail

SCENARIO="${1:?scenario}"
OUT_DIR="${2:-${TMPDIR:-/tmp}/di_soft_dependencies}"
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
PORT=5611
mkdir -p "$OUT_DIR"
RAW="$OUT_DIR/$SCENARIO.raw.log"
OUT="$OUT_DIR/$SCENARIO.txt"

PLUGINS=(diSoftDepsLookupA diSoftDepsLookupB diSoftDepsRegistryA diSoftDepsRegistryB diSoftDepsClassicConsumer)
ARGS=()
EXPECTED=5
case "$SCENARIO" in
  both) ;;
  a_off) ARGS+=(--di_soft_deps_lookup_a.enabled=false --di_soft_deps_registry_a.enabled=false); EXPECTED=3 ;;
  b_off) ARGS+=(--di_soft_deps_lookup_b.enabled=false --di_soft_deps_registry_b.enabled=false); EXPECTED=3 ;;
  *) echo "unknown scenario $SCENARIO"; exit 2 ;;
esac

cd "$ROOT"
node scripts/kibana --dev --run-examples --no-base-path --no-watch \
  --server.port=$PORT ${ARGS[@]+"${ARGS[@]}"} >"$RAW" 2>&1 &
KBN_PID=$!

STATUS=timeout
for _ in $(seq 1 1200); do
  if grep -q "Kibana is now available" "$RAW"; then STATUS=available; break; fi
  if grep -qE "FATAL|circular dependencies|server crashed" "$RAW"; then STATUS=failed; break; fi
  if ! kill -0 $KBN_PID 2>/dev/null; then STATUS=exited; break; fi
  sleep 1
done

# The dev optimizer may still be compiling bundles after the server is up.
for _ in $(seq 1 900); do
  [ "$STATUS" = available ] || break
  grep -qE "RSPack build completed" "$RAW" && break
  grep -qE "optimizer.*(failed|error)" "$RAW" && break
  sleep 1
done

{
  echo "scenario=$SCENARIO status=$STATUS"
  grep -E "Setting up \[[0-9]{2,}" "$RAW" | tr ',[]' '\n\n\n' | grep -E "^diSoftDeps" | tr '\n' ' ' | sed 's/^/setup order: /'
  echo
  grep -E "diSoftDeps|di_soft_deps|circular|FATAL|Ambiguous" "$RAW" | grep -vE "Setting up \[|Starting \[" | sed -E 's/^.*\]\[//' | head -40
  if [ "$STATUS" = available ]; then
    echo "--- server routes"
    for id in "${PLUGINS[@]}"; do
      echo "$id: $(curl -s -m 10 -u elastic:changeme -H 'x-elastic-internal-origin: verify' "http://localhost:$PORT/api/di_soft_deps/$id")"
    done
    echo "--- browser"
    node "$HERE/browser_check.js" $PORT $EXPECTED
  fi
} >"$OUT" 2>&1

pkill -TERM -P $KBN_PID 2>/dev/null
kill -TERM $KBN_PID 2>/dev/null
for _ in $(seq 1 30); do kill -0 $KBN_PID 2>/dev/null || break; sleep 1; done
pkill -KILL -f "server.port=$PORT" 2>/dev/null
cat "$OUT"
