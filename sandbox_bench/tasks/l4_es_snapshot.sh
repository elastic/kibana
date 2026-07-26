#!/usr/bin/env bash
# L4 — run Elasticsearch from the latest snapshot build via
# `node scripts/es snapshot`. Measures snapshot download + JVM boot inside the
# sandbox. Success: ES answers HTTP on :9200 (200, or 401 with security on).

ES_READY_TIMEOUT="${ES_READY_TIMEOUT:-840}"

ensure_repo
ensure_toolchain
ensure_bootstrap

cd "$KIBANA_DIR"

bench_phase es_start
nohup node scripts/es snapshot --license trial >"$HOME/es.log" 2>&1 &
ES_PID=$!

if ! wait_for_http "http://localhost:9200" "$ES_READY_TIMEOUT"; then
  tail -20 "$HOME/es.log" || true
  bench_fail es_not_ready
fi
bench_phase es_ready
bench_kv es_pid "$ES_PID"

# Leave ES running when the runner will snapshot the sandbox (warm mode);
# otherwise shut it down so sequential local iterations don't collide.
if [[ "${BENCH_KEEP_STACK:-0}" != "1" ]]; then
  kill "$ES_PID" 2>/dev/null || true
fi

bench_phase done
