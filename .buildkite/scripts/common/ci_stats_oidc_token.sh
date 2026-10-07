#!/usr/bin/env bash

set -euo pipefail

# Standard claims (organization, pipeline, build, step, and job identity) are always included;
# --claim only accepts the optional cluster, queue, and agent tag claims.
# CiStatsClient and CiStatsReporter refresh after 240s, so keep the lifetime above that.
exec buildkite-agent oidc request-token \
  --audience elastic-access-broker \
  --lifetime 300 \
  --claim "cluster_id,queue_id,queue_key"
