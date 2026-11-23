#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

load_cloud_deploy_credentials
load_project_deploy_credentials

echo '--- Purging Cloud deployments'
node .buildkite/scripts/steps/cloud/purge_deployments.ts

echo '--- Purging Project deployments'
node .buildkite/scripts/steps/cloud/purge_projects.ts
