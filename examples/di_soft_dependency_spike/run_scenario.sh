#!/usr/bin/env bash
# Throwaway spike runner. Boots a real Kibana (dev mode, no optimizer) against a local ES
# with the spike plugins, records what each plugin saw, and shuts Kibana down.
#
# Usage: run_scenario.sh <both|a_off|b_off|control>
# Output: results/<scenario>.log (filtered boot log) and results/<scenario>.json (route responses)
set -uo pipefail

SCENARIO="${1:?scenario}"
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PORT=5611
mkdir -p "$HERE/results"
RAW="$HERE/results/$SCENARIO.raw.log"
OUT="$HERE/results/$SCENARIO.log"
JSON="$HERE/results/$SCENARIO.json"

SPIKE_PLUGINS=(opt_a opt_b reg_a reg_b rt_a rt_b)
ARGS=()
case "$SCENARIO" in
  both) ;;
  a_off) ARGS+=(--spike_opt_a.enabled=false --spike_reg_a.enabled=false --spike_rt_a.enabled=false) ;;
  b_off) ARGS+=(--spike_opt_b.enabled=false --spike_reg_b.enabled=false --spike_rt_b.enabled=false) ;;
  control) SPIKE_PLUGINS=() ;;
  *) echo "unknown scenario $SCENARIO"; exit 2 ;;
esac
for p in ${SPIKE_PLUGINS[@]+"${SPIKE_PLUGINS[@]}"}; do ARGS+=(--plugin-path "$HERE/plugins/$p"); done
if [ "$SCENARIO" = control ]; then
  ARGS+=(--plugin-path "$HERE/control/classic_a" --plugin-path "$HERE/control/classic_b")
fi

cd "$ROOT"
node scripts/kibana --dev --no-base-path --no-optimizer --no-watch \
  --server.port=$PORT --logging.root.level=info "${ARGS[@]}" >"$RAW" 2>&1 &
KBN_PID=$!

STATUS=timeout
for _ in $(seq 1 300); do
  if grep -q "Kibana is now available" "$RAW"; then STATUS=available; break; fi
  if grep -qE "FATAL|circular dependencies|server crashed|Unhandled" "$RAW"; then STATUS=failed; break; fi
  if ! kill -0 $KBN_PID 2>/dev/null; then STATUS=exited; break; fi
  sleep 1
done
sleep 2

{
  echo "scenario=$SCENARIO status=$STATUS"
  grep -E "Setting up \[[0-9]{2,}" "$RAW" | tr ',[]' '\n\n\n' | grep -E "^spike" | tr '\n' ' ' | sed 's/^/setup order: /'
  echo
  grep -E "spike|circular|FATAL" "$RAW" | grep -vE "Setting up \[|Starting \[|Explicit plugin paths" | sed -E 's/^.*\]\[//'
} >"$OUT"

echo "{" >"$JSON"
if [ "$STATUS" = available ]; then
  for id in spikeOptA spikeOptB spikeRegA spikeRegB spikeRtA spikeRtB; do
    body=$(curl -s -m 10 -u elastic:changeme -H 'x-elastic-internal-origin: spike' "http://localhost:$PORT/api/spike/$id")
    echo "  \"$id\": ${body:-null}," >>"$JSON"
  done
fi
echo "  \"status\": \"$STATUS\"" >>"$JSON"
echo "}" >>"$JSON"

pkill -TERM -P $KBN_PID 2>/dev/null
kill -TERM $KBN_PID 2>/dev/null
for _ in $(seq 1 30); do kill -0 $KBN_PID 2>/dev/null || break; sleep 1; done
pkill -KILL -f "server.port=$PORT" 2>/dev/null
cat "$OUT"
echo "--- route responses"
cat "$JSON"
