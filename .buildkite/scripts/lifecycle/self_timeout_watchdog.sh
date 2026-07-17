#!/usr/bin/env bash

set -euo pipefail

timeout="$1"
timeout_marker="$2"
command_process_group="$3"

# Wait for the timeout to expire
sleep "${timeout}"

# Kill the command process group. If it is already gone, the command finished
# on its own near the deadline, so do not record a self-timeout.
if ! kill -TERM -- "-${command_process_group}" 2>/dev/null; then
  exit 0
fi

# Mark the timeout with a file, this is less ambiguous than a signal/exit code.
touch "${timeout_marker}"
# If the command process group is not killed, kill it again after 60 seconds.
sleep 60s
kill -KILL -- "-${command_process_group}" 2>/dev/null || true
