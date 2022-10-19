#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check Event Log Schema

# event log schema is pinned to a specific version of ECS
ECS_STABLE_VERSION=1.8
git clone --depth 1 -b $ECS_STABLE_VERSION https://github.com/elastic/ecs.git ../ecs

node x-pack/plugins/event_log/scripts/create_schemas.js

check_for_changed_files 'node x-pack/plugins/event_log/scripts/create_schemas.js' false 'Follow the directions in x-pack/plugins/event_log/generated/README.md to make schema changes for the event log.'
