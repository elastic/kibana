#!/usr/bin/env bash
set -euo pipefail

.buildkite/scripts/bootstrap.sh

node scripts/snapshot_plugin_types
