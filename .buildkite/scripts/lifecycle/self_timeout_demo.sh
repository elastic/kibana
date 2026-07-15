#!/usr/bin/env bash

set -euo pipefail

run_demo() {
  local scenario="${1:?scenario required}"

  case "${scenario}" in
    opt_in_control)
      echo "--- Watchdog disabled; command should finish normally"
      sleep 2
      ;;
    term_responsive)
      trap 'echo "--- Command handled SIGTERM"; exit 0' TERM
      echo "--- Waiting for the watchdog and handling SIGTERM"
      sleep infinity
      ;;
    term_ignoring)
      trap '' TERM
      echo "--- Waiting for the watchdog and ignoring SIGTERM"
      sleep infinity
      ;;
    exit_137)
      echo "--- Exiting 137 before the watchdog fires"
      exit 137
      ;;
    *)
      echo "Unknown self-timeout demo scenario: ${scenario}" >&2
      exit 2
      ;;
  esac
}

run_demo "$@"
