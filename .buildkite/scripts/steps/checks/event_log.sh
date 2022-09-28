#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check Event Log Schema

node x-pack/plugins/event_log/scripts/create_schemas.js
check_for_changed_files 'node x-pack/plugins/event_log/scripts/create_schemas.js' false
