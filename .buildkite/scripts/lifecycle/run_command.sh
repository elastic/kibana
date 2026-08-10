#!/usr/bin/env bash

# Executes the job command for Buildkite's `command` hook, which overrides the
# agent's default command execution for every job in every pipeline using this
# repo's hooks.

run_job_command() {
  # Some step scripts are committed without the executable bit, which makes
  # `/bin/bash -ec "<path>"` fail with 126 (Permission denied). Add it back
  # here until the bits are fixed in source control.
  ensure_command_executable "${BUILDKITE_COMMAND:-}"

  # The invocation the agent would run itself, defined once so every branch
  # executes the exact same command.
  local -a command=(/bin/bash -ec "${BUILDKITE_COMMAND:-}")

  local timeout_min="${KIBANA_SELF_TIMEOUT_MINUTES:-}"
  if [[ -n "${timeout_min}" ]]; then
    if [[ ! "${timeout_min}" =~ ^[1-9][0-9]*$ ]]; then
      echo "KIBANA_SELF_TIMEOUT_MINUTES must be a positive integer" >&2
      return 2
    fi

    run_with_self_timeout "${timeout_min}" "${command[@]}"
  else
    # Default: run the command unwrapped.
    "${command[@]}"
  fi
}

# Runs the command in its own process group so the watchdog can terminate the
# complete process tree and record that it initiated the termination.
run_with_self_timeout() {
  local timeout_min="$1"
  shift

  local marker_dir
  marker_dir="$(mktemp -d "${TMPDIR:-/tmp}/kibana-self-timeout.XXXXXX")"
  local timeout_marker="${marker_dir}/timed_out"

  echo "--- Running script (self-timeout set to ${timeout_min}m)"

  setsid "$@" &
  local command_pid=$!

  setsid .buildkite/scripts/lifecycle/self_timeout_watchdog.sh \
    "${timeout_min}m" "${timeout_marker}" "${command_pid}" &
  local watchdog_pid=$!

  local signal_exit_status=0
  trap 'signal_exit_status=143; signal_process_group TERM "${command_pid}"' TERM
  trap 'signal_exit_status=130; signal_process_group INT "${command_pid}"' INT

  local command_exit_status=0
  wait "${command_pid}" || command_exit_status=$?

  if ((signal_exit_status != 0)); then
    signal_process_group KILL "${command_pid}"
  fi

  stop_watchdog "${watchdog_pid}"
  trap - TERM INT

  # A child can exit 137 for unrelated reasons. Only the watchdog marker turns
  # the result into the deferred self-timeout status.
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

# Inspects each line of the command and, when its first token is a repo script
# file that is missing the executable bit, restores it so bash can run it.
ensure_command_executable() {
  local command_string="$1"
  local line first_token

  while IFS= read -r line; do
    # Ignore leading whitespace, then take the first whitespace-delimited token.
    read -r first_token _ <<<"${line}"

    if [[ -n "${first_token}" && -f "${first_token}" && ! -x "${first_token}" ]]; then
      echo "Restoring executable bit on ${first_token}" >&2
      chmod +x "${first_token}"
    fi
  done <<<"${command_string}"
}

signal_process_group() {
  local signal="$1"
  local process_group_id="$2"
  kill -"${signal}" -- "-${process_group_id}" 2>/dev/null || true
}

stop_watchdog() {
  local watchdog_pid="$1"
  kill -TERM -- "-${watchdog_pid}" 2>/dev/null || kill "${watchdog_pid}" 2>/dev/null || true
  wait "${watchdog_pid}" 2>/dev/null || true
}

run_job_command
