#!/usr/bin/env bash

set -euo pipefail

exec buildkite-agent oidc request-token \
  --audience elastic-access-broker \
  --lifetime 300 \
  --claim "organization_slug,pipeline_id,build_id,build_commit,cluster_id,queue_id,queue_key,step_key,job_id"
