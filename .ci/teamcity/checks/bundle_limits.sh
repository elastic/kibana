#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

node scripts/build_kibana_platform_plugins --validate-limits
