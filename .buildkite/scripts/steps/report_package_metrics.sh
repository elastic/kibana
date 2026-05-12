#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo "--- Report Package Metrics"
node --max-old-space-size=24000 scripts/report_package_metrics
