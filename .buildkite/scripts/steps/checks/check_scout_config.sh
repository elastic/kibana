#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check for unregistered Scout Playwright configs
node scripts/scout discover-playwright-configs --validate 
