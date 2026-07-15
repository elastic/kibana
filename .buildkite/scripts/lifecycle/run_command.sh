#!/usr/bin/env bash

# Executes the job command for Buildkite's `command` hook, which overrides the
# agent's default command execution for every job in every pipeline using this
# repo's hooks.

run_job_command() {
  # The invocation the agent would run itself, defined once so every branch
  # executes the exact same command.
  local -a command=(/bin/bash -ec "${BUILDKITE_COMMAND:-}")

  local budget_min
  budget_min="$(self_timeout_budget_min)"
  if [[ -n "${budget_min}" ]]; then
    run_with_self_timeout "${budget_min}" "${command[@]}"
  else
    # Default: run the command unwrapped.
    "${command[@]}"
  fi
}

# Echoes the self-timeout deadline (minutes) when explicitly enabled and the
# job can terminate before Buildkite's own timeout.
self_timeout_budget_min() {
  if [[ ! "${SELF_TIMEOUT_ENABLED:-}" =~ ^(1|true)$ ]]; then
    return
  fi

  # Minutes trimmed off BUILDKITE_TIMEOUT to derive the self-imposed deadline.
  local margin_min="${SELF_TIMEOUT_MARGIN_MIN:-2}"
  # Only self-timeout jobs whose Buildkite timeout is at least this.
  local threshold_min="${SELF_TIMEOUT_THRESHOLD_MIN:-20}"

  local timeout_min="${BUILDKITE_TIMEOUT:-false}"
  if [[ "${timeout_min}" =~ ^[0-9]+$ ]] && ((timeout_min >= threshold_min)); then
    echo "$((timeout_min - margin_min))"
  fi
}

# Runs the command in its own process group so the watchdog can terminate the
# complete process tree and record that it initiated the termination.
run_with_self_timeout() {
  local kill_after="${SELF_TIMEOUT_KILL_AFTER:-60s}"
  local budget_min="$1"
  shift

  local marker_dir
  marker_dir="$(mktemp -d "${TMPDIR:-/tmp}/kibana-self-timeout.XXXXXX")"
  local timeout_marker="${marker_dir}/timed_out"

  echo "--- Running script (self-timeout set to ${budget_min}m)"

  setsid "$@" &
  local command_pid=$!

  setsid /bin/bash -c '
    sleep "$1"
    touch "$2"
    kill -TERM -- "-$4" 2>/dev/null || exit 0
    sleep "$3"
    kill -KILL -- "-$4" 2>/dev/null || true
  ' _ "${budget_min}m" "${timeout_marker}" "${kill_after}" "${command_pid}" &
  local watchdog_pid=$!

  local signal_exit_status=0
  trap 'signal_exit_status=143; kill -TERM -- "-${command_pid}" 2>/dev/null || true' TERM
  trap 'signal_exit_status=130; kill -INT -- "-${command_pid}" 2>/dev/null || true' INT

  local command_exit_status=0
  wait "${command_pid}" || command_exit_status=$?

  if ((signal_exit_status != 0)); then
    kill -KILL -- "-${command_pid}" 2>/dev/null || true
  fi

  kill -TERM -- "-${watchdog_pid}" 2>/dev/null || kill "${watchdog_pid}" 2>/dev/null || true
  wait "${watchdog_pid}" 2>/dev/null || true
  trap - TERM INT

  if [[ -f "${timeout_marker}" ]]; then
    export KIBANA_SELF_TIMEOUT_EXIT_STATUS=124
    command_exit_status=0
  elif ((signal_exit_status != 0)); then
    command_exit_status="${signal_exit_status}"
  fi

  rm -f "${timeout_marker}"
  rmdir "${marker_dir}"
  return "${command_exit_status}"
}

run_job_command
