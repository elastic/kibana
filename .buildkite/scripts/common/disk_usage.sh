#!/usr/bin/env bash

print_disk_usage() {
  local measurement="${1:-current}"
  local path
  local filesystems=(. "${HOME}")
  local paths=(
    node_modules
    .pnpm-store
    .moon/cache
    target
    .es
    "${HOME}/.cache/kibana"
    /dev/shm/pnpm-store
    "${HOME}/.cache"
    "${HOME}/.kibana"
  )

  if [[ -d /dev/shm ]]; then
    filesystems+=(/dev/shm)
  fi

  echo "--- Disk usage: ${measurement}"
  df -h "${filesystems[@]}" | awk 'NR == 1 || !seen[$1]++' || true

  for path in "${paths[@]}"; do
    if [[ -e "$path" ]]; then
      du -sh "$path" || true
    fi
  done
}

DISK_USAGE_STATE_DIR="${TMPDIR:-/tmp}/kibana-disk-usage-${BUILDKITE_JOB_ID:-local}"

# Prints "<size_mib> <used_mib>" for the filesystem containing the given path.
_disk_size_and_used_mib() {
  df --output=size,used -BM "$1" 2>/dev/null | awk 'NR == 2 { print $1 + 0, $2 + 0 }'
}

# State file fields: start_used peak_used shm_peak root_size end_used peak_at (MiB, ISO timestamp last).
_record_disk_usage_sample() {
  local state_file="${DISK_USAGE_STATE_DIR}/state"
  local now root_size root_used shm_used=0
  local start_used peak_used=0 shm_peak=0 prev_size prev_end peak_at=''

  read -r root_size root_used < <(_disk_size_and_used_mib /) || return 0
  if [[ -d /dev/shm ]]; then
    read -r _ shm_used < <(_disk_size_and_used_mib /dev/shm) || shm_used=0
  fi
  now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  if [[ -f "$state_file" ]]; then
    read -r start_used peak_used shm_peak prev_size prev_end peak_at < "$state_file"
  else
    start_used="$root_used"
  fi

  if ((root_used > peak_used)); then
    peak_used="$root_used"
    peak_at="$now"
  fi
  if ((shm_used > shm_peak)); then
    shm_peak="$shm_used"
  fi

  printf '%s %s %s %s %s %s\n' "$start_used" "$peak_used" "$shm_peak" "$root_size" "$root_used" "$peak_at" \
    > "${state_file}.tmp" && mv -f "${state_file}.tmp" "$state_file"
}

# Starts a detached background loop that records the peak disk usage of the job every N seconds.
start_disk_usage_sampler() {
  local interval="${DISK_USAGE_SAMPLE_INTERVAL_SECONDS:-30}"

  mkdir -p "$DISK_USAGE_STATE_DIR" || return 0
  rm -f "${DISK_USAGE_STATE_DIR}/state"
  _record_disk_usage_sample || true

  # stdio must not inherit the hook's pipes, otherwise the agent waits for this loop before finishing the hook.
  (
    set +e
    trap 'exit 0' TERM
    while true; do
      sleep "$interval" &
      wait $!
      _record_disk_usage_sample
    done
  ) </dev/null >/dev/null 2>&1 &
  echo "$!" > "${DISK_USAGE_STATE_DIR}/sampler.pid"
}

# Stops the sampler, prints the watermark and stores it as job-scoped build meta-data.
stop_disk_usage_sampler() {
  local pid_file="${DISK_USAGE_STATE_DIR}/sampler.pid"
  local state_file="${DISK_USAGE_STATE_DIR}/state"
  local start_used peak_used shm_peak root_size end_used peak_at summary
  local interval="${DISK_USAGE_SAMPLE_INTERVAL_SECONDS:-30}"

  [[ -f "$pid_file" ]] || return 0
  kill "$(cat "$pid_file")" 2>/dev/null || true
  rm -f "$pid_file"

  _record_disk_usage_sample || true
  [[ -f "$state_file" ]] || return 0
  read -r start_used peak_used shm_peak root_size end_used peak_at < "$state_file"

  echo "--- Disk usage: watermark (sampled every ${interval}s)"
  echo "/ size: ${root_size}M, start: ${start_used}M, peak: ${peak_used}M at ${peak_at}, end: ${end_used}M, min free: $((root_size - peak_used))M"
  echo "/dev/shm peak: ${shm_peak}M"

  if [[ -z "${BUILDKITE_JOB_ID:-}" ]] || ! command -v buildkite-agent > /dev/null; then
    return 0
  fi

  summary="$(printf '{"root_size_mib":%s,"root_start_used_mib":%s,"root_peak_used_mib":%s,"root_end_used_mib":%s,"root_peak_at":"%s","shm_peak_used_mib":%s,"sample_interval_seconds":%s}' \
    "$root_size" "$start_used" "$peak_used" "$end_used" "$peak_at" "$shm_peak" "$interval")"
  buildkite-agent meta-data set "${BUILDKITE_JOB_ID}_disk_usage" "$summary" || true
}
