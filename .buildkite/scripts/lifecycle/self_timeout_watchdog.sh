#!/usr/bin/env bash

set -euo pipefail

timeout="$1"
timeout_marker="$2"
command_process_group="$3"

# Wait for the timeout to expire
sleep "${timeout}"
# Mark the timeout with a file, this is not as ambiguous as a signal/exit code.
touch "${timeout_marker}"

# Kill the command process group.
kill -TERM -- "-${command_process_group}" 2>/dev/null || exit 0
# If the command process group is not killed, kill it again after 60 seconds.
sleep 60s
kill -KILL -- "-${command_process_group}" 2>/dev/null || true
