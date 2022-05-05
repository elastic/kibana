#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/build_kibana.sh
.buildkite/scripts/build_kibana_plugins.sh
.buildkite/scripts/post_build_kibana_plugins.sh
.buildkite/scripts/post_build_kibana.sh
.buildkite/scripts/saved_object_field_metrics.sh
