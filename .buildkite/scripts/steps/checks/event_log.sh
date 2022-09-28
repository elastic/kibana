#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check Event Log Schema

# check out the latest stable version of ECS
ECS_STABLE_VERSION=8.4
git clone -b $ECS_STABLE_VERSION https://github.com/elastic/ecs.git ../ecs

node x-pack/plugins/event_log/scripts/create_schemas.js

check_for_changed_files 'node x-pack/plugins/event_log/scripts/create_schemas.js' false
