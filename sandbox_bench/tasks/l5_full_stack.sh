#!/usr/bin/env bash
# L5 — the flagship: Elasticsearch from snapshot + Kibana dev server, until the
# stack is genuinely usable:
#   es_ready          → ES answers on :9200
#   kibana_available  → GET /api/status returns 200 (authenticated dev creds)
#   first_page        → GET /login serves the app
# `node scripts/es snapshot` provisions dev users (elastic/changeme), which the
# Kibana dev config picks up automatically.

ES_READY_TIMEOUT="${ES_READY_TIMEOUT:-840}"
KBN_READY_TIMEOUT="${KBN_READY_TIMEOUT:-1800}"

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

bench_phase kibana_start
nohup node scripts/kibana --dev --no-base-path --host 0.0.0.0 >"$HOME/kibana.log" 2>&1 &
KBN_PID=$!
if ! wait_for_http "http://elastic:changeme@localhost:5601/api/status" "$KBN_READY_TIMEOUT" '^200$'; then
  tail -40 "$HOME/kibana.log" || true
  bench_fail kibana_not_available
fi
bench_phase kibana_available

if ! wait_for_http "http://localhost:5601/login" 120 '^200$'; then
  bench_fail login_page_not_served
fi
bench_phase first_page

bench_kv es_pid "$ES_PID"
bench_kv kibana_pid "$KBN_PID"
bench_kv status_json "$(curl -s -m 10 -u elastic:changeme http://localhost:5601/api/status | head -c 200 | tr -d '\n' || true)"

if [[ "${BENCH_KEEP_STACK:-0}" != "1" ]]; then
  kill "$KBN_PID" "$ES_PID" 2>/dev/null || true
fi

bench_phase done
