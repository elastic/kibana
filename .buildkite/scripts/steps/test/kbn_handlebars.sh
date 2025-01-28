#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo '--- Checking for @kbn/handlebars upstream updates'
src/platform/packages/private/kbn-handlebars/scripts/check_for_upstream_updates.sh
