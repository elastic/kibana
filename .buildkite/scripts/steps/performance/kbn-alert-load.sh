#!/usr/bin/env bash

set -euo pipefail

echo "--- Install KBN-ALERT-LOAD"

yarn add nkhristinin/kbn-alert-load

echo "--- Run IM tests"

npx kbn-alert-load run im-test