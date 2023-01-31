#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo '--- Checking for @kbn/handlebars test changes'
packages/kbn-handlebars/scripts/check_for_test_changes.sh
