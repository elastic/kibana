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
    return
  fi

  # Default: run the command unwrapped.
  "${command[@]}"
}

# Echoes the self-timeout deadline (minutes) when the job should terminate
# itself before Buildkite's own timeout; echoes nothing otherwise.
self_timeout_budget_min() {
  # Minutes trimmed off BUILDKITE_TIMEOUT to derive the self-imposed deadline.
  local margin_min="${SELF_TIMEOUT_MARGIN_MIN:-2}"
  # Only self-timeout jobs whose Buildkite timeout is at least this.
  local threshold_min="${SELF_TIMEOUT_THRESHOLD_MIN:-20}"

  local timeout_min="${BUILDKITE_TIMEOUT:-false}"
  if [[ "${timeout_min}" =~ ^[0-9]+$ ]] && ((timeout_min >= threshold_min)); then
    echo "$((timeout_min - margin_min))"
  fi
}

# Runs the command with a self-timeout, to avoid signaling -1 (agent lost / spot preemption).
run_with_self_timeout() {
  # Grace period between SIGTERM and SIGKILL once the deadline is reached.
  local kill_after="${SELF_TIMEOUT_KILL_AFTER:-60s}"

  local budget_min="$1"
  shift

  echo "--- Running command with a ${budget_min}m self-timeout (Buildkite timeout: ${BUILDKITE_TIMEOUT}m)"
  echo "Exceeding it exits 124, distinct from -1 (agent lost / spot preemption), so retries can be scoped to real infra loss."

  # GNU timeout exits 124 on deadline (even after escalating to SIGKILL).
  timeout --signal=TERM --kill-after="${kill_after}" "${budget_min}m" "$@"
}

run_job_command
