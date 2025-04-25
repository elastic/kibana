#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check Event Log Schema

# event log schema is pinned to a specific version of ECS
ECS_STABLE_VERSION=1.8

# we can potentially skip this check on a local env, if ../ecs is present, and modified by the developer
if [[ "${CI:-false}" =~ ^(0|false)$ ]] && [[ -d '../ecs' ]]; then
  LOCAL_ECS_BRANCH=$(git -C ../ecs branch --show-current)
  if [[ "$LOCAL_ECS_BRANCH" != "$ECS_STABLE_VERSION" ]]; then
    echo "Skipping event log schema check because ECS schema is not on $ECS_STABLE_VERSION."
    exit 0
  fi

  TOUCHED_FILES=$(git -C ../ecs status --porcelain)
  if [[ -n "$TOUCHED_FILES" ]]; then
    echo "Skipping event log schema check because ECS schema files have been modified."
    exit 0
  fi

  echo "../ecs is already cloned and @ $ECS_STABLE_VERSION"
else
  git clone --depth 1 -b $ECS_STABLE_VERSION https://github.com/elastic/ecs.git ../ecs
fi

node x-pack/plugins/event_log/scripts/create_schemas.js

check_for_changed_files 'node x-pack/plugins/event_log/scripts/create_schemas.js' false 'Follow the directions in x-pack/plugins/event_log/generated/README.md to make schema changes for the event log.'
