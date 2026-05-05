#!/usr/bin/env bash

set -euo pipefail

# Pre-trigger gate. When DRY_RUN=true, cancels the named downstream step(s)
# (typically a `trigger:` step) so they appear in the UI as cancelled with a
# clear log, instead of actually triggering downstream pipelines.
#
# Usage: dry_run_gate.sh <step-key> [<step-key> ...]

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <step-key> [<step-key> ...]" >&2
  exit 1
fi

if [[ "${DRY_RUN:-}" != "true" ]]; then
  echo "DRY_RUN is not set; proceeding with: $*"
  exit 0
fi

for key in "$@"; do
  echo "--- DRY_RUN: cancelling downstream step '$key'"
  buildkite-agent step cancel "$key"
done
