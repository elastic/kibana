#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo "--- Report Package Metrics"
node scripts/report_package_metrics
