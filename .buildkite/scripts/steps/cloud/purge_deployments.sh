#!/usr/bin/env bash

set -euo pipefail

echo '--- Purging Cloud deployments'
node .buildkite/scripts/steps/cloud/purge_deployments.ts

echo '--- Purging Project deployments'
node .buildkite/scripts/steps/cloud/purge_projects.ts
