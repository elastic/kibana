#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

.buildkite/scripts/build_kibana.sh
.buildkite/scripts/post_build_kibana.sh

# Record this build as the effective build for downstream steps (e.g. the
# warm-start memory bench only runs against a distributable built from this PR).
buildkite-agent meta-data set "kibana-effective-build-id" "$BUILDKITE_BUILD_ID"
