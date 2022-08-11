#!/usr/bin/env bash

set -euo pipefail

echo "--- Build Platform Plugins"
THREADS=$(grep -c ^processor /proc/cpuinfo)
node scripts/build_kibana_platform_plugins --examples --test-plugins --workers "$THREADS" --no-inspect-workers --no-progress
