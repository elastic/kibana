#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/build_kibana.sh
.buildkite/scripts/post_build_kibana.sh
