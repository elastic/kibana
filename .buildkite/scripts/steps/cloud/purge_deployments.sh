#!/usr/bin/env bash

set -euo pipefail

echo '--- Purging Cloud deployments'
ts-node .buildkite/scripts/steps/cloud/purge_deployments.ts

echo '--- Purging Project deployments'
ts-node .buildkite/scripts/steps/cloud/purge_projects.ts
