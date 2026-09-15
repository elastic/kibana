#!/usr/bin/env bash

# POC: detect GCE spot preemption from inside the VM while an FTR job runs.
#
# Long-polls the GCE metadata server for `instance/preempted` and, when it flips
# to TRUE, records what was running so the retry attempt can attribute the loss.
# Observational only: never affects the exit status of the step.
#
# Usage (from a step script):
#   .buildkite/scripts/common/preemption_watcher.sh &
#   PREEMPTION_WATCHER_PID=$!
#   trap 'kill "$PREEMPTION_WATCHER_PID" 2>/dev/null || true' EXIT
#   echo "<config>" > target/preemption/current_config   # before each unit of work
#
# Env:
#   PREEMPTION_METADATA_HOST    override metadata host (tests); default metadata.google.internal
#   PREEMPTION_STATE_DIR        default target/preemption
#   PREEMPTION_STOP_AGENT       1/true: SIGQUIT the agent after recording, so the job fails fast

set -uo pipefail

METADATA_HOST="${PREEMPTION_METADATA_HOST:-metadata.google.internal}"
METADATA_URL="http://${METADATA_HOST}/computeMetadata/v1/instance"
STATE_DIR="${PREEMPTION_STATE_DIR:-target/preemption}"
CURRENT_CONFIG_FILE="$STATE_DIR/current_config"
MARKER_FILE="$STATE_DIR/preempted.json"
META_KEY="${BUILDKITE_STEP_ID:-local}${FTR_CONFIG_GROUP_KEY:-}_preempted"

log() {
  echo "[preemption-watcher] $*"
}

metadata_get() {
  curl -sf --connect-timeout 2 --max-time "${2:-5}" -H 'Metadata-Flavor: Google' "$METADATA_URL/$1"
}

mkdir -p "$STATE_DIR"

if ! metadata_get 'id' >/dev/null 2>&1; then
  log "metadata server unreachable, not watching"
  exit 0
fi

if [[ "$(metadata_get 'scheduling/preemptible')" != "TRUE" ]]; then
  log "instance is not preemptible, not watching"
  exit 0
fi

log "watching $METADATA_URL/preempted (meta-data key: $META_KEY)"

# wait_for_change blocks until the value changes or timeout_sec elapses; on
# timeout it returns the current value, so just loop. last_etag makes the
# server return immediately if the value changed between two requests, so a
# flip in the gap between polls is never missed. curl runs in the background
# so a TERM from the step's EXIT trap is handled immediately instead of after
# the long-poll completes.
poll_pid=""
trap 'kill "$poll_pid" 2>/dev/null; exit 0' TERM INT
poll_out="$STATE_DIR/.poll"
poll_headers="$STATE_DIR/.poll_headers"
# "0" never matches a real etag, so the first request returns immediately.
etag="0"
while true; do
  curl -sf --connect-timeout 2 --max-time 310 -H 'Metadata-Flavor: Google' -D "$poll_headers" \
    "$METADATA_URL/preempted?wait_for_change=true&timeout_sec=300&last_etag=${etag}" > "$poll_out" &
  poll_pid=$!
  wait "$poll_pid"
  [[ "$(cat "$poll_out" 2>/dev/null)" == "TRUE" ]] && break
  etag=$(sed -n 's/^[Ee][Tt][Aa][Gg]: *\([^[:space:]]*\).*/\1/p' "$poll_headers" 2>/dev/null || true)
  etag="${etag:-0}"
  sleep 1 &
  poll_pid=$!
  wait "$poll_pid"
done
trap - TERM INT
rm -f "$poll_out" "$poll_headers"

detected_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
current_config=$(cat "$CURRENT_CONFIG_FILE" 2>/dev/null || echo '')

log "PREEMPTION DETECTED at $detected_at while running: ${current_config:-<none>}"
echo "^^^ +++"

# Best-effort within the ~30s shutdown window; meta-data first, it is the only
# thing the retry attempt can read.
buildkite-agent meta-data set "$META_KEY" "${detected_at} ${current_config}" || true

printf '{"detected_at":"%s","job_id":"%s","retry_count":"%s","config":"%s"}\n' \
  "$detected_at" "${BUILDKITE_JOB_ID:-}" "${BUILDKITE_RETRY_COUNT:-0}" "$current_config" > "$MARKER_FILE" || true

buildkite-agent annotate --style warning --context "preemption-${BUILDKITE_JOB_ID:-local}" \
  "Spot preemption detected at ${detected_at} in job \`${BUILDKITE_LABEL:-$META_KEY}\` (attempt $((${BUILDKITE_RETRY_COUNT:-0} + 1))) while running \`${current_config:-<none>}\`" || true

# Optional: stop the agent now instead of letting Buildkite discover it as lost.
# A lost agent costs ~3 min heartbeat timeout + up to 60s reaper tick before the
# job fails with exit -1 and becomes retryable. SIGQUIT makes the agent cancel
# the job (cancel-signal, then SIGKILL after cancel-signal-timeout), upload what
# it has within cancel-cleanup-timeout, and report signal_reason=agent_stop,
# which the step's retry rules match immediately. Ordered last: the writes above
# must land before the job's process tree (including this watcher) is killed.
if [[ "${PREEMPTION_STOP_AGENT:-}" =~ ^(1|true)$ ]]; then
  agent_pid="${BUILDKITE_AGENT_PID:-}"
  if [[ -z "$agent_pid" ]]; then
    # The daemon is `buildkite-agent start`; its `buildkite-agent bootstrap`
    # child is an ancestor of this watcher and must not be the target.
    agent_pid=$(pgrep -f 'buildkite-agent start' || true)
  fi
  if [[ -z "$agent_pid" ]]; then
    stop_result="no agent pid found"
  elif [[ "$(echo "$agent_pid" | wc -l)" -ne 1 ]]; then
    stop_result="ambiguous agent pids: $(echo "$agent_pid" | paste -sd, -)"
  else
    kill_err=$(kill -QUIT "$agent_pid" 2>&1); kill_rc=$?
    stop_result="SIGQUIT pid=$agent_pid rc=$kill_rc${kill_err:+ ($kill_err)}"
  fi
  log "stop agent: $stop_result"
  buildkite-agent meta-data set "${META_KEY}_stop" "$(date -u +%Y-%m-%dT%H:%M:%SZ) $stop_result" || true
fi
