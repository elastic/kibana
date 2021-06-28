#!/usr/bin/env bash

set -euo pipefail

if [[ "$BUILDKITE_COMMAND_EXIT_STATUS" != "0" ]]; then
  buildkite-agent meta-data set build_failed true
fi
