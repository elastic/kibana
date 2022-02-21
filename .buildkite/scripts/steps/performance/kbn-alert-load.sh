#!/usr/bin/env bash

set -euo pipefail

echo "--- Install KBN-ALERT-LOAD"

mkdir kbn-alert-load
cd kbn-alert-load
yarn add nkhristinin/kbn-alert-load

echo "--- Run IM tests"

npx kbn-alert-load run im-test