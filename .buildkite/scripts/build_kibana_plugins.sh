#!/usr/bin/env bash

set -euo pipefail

echo "--- Build Platform Plugins"
node scripts/build_kibana_platform_plugins --examples --test-plugins
