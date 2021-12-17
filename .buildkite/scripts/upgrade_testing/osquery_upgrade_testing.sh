#!/bin/bash

set -euo pipefail

.buildkite/scripts/lifecycle/pre_build.sh
.buildkite/scripts/bootstrap.sh

node .buildkite/scripts/upgrade_testing/osquery_upgrade_testing.js
