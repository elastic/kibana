#!/usr/bin/env bash

set -euo pipefail

echo "--- Install KBN-ALERT-LOAD"

mkdir kbn-alert-load
cd kbn-alert-load
yarn add test-alert-load-kbn

echo "--- Run IM tests"

npx test-alert-load-kbn run im-test