#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo "--- Build Kibana Distribution"
node scripts/build --all-platforms --debug --skip-docker-cloud

echo "--- Build dependencies report"
node scripts/licenses_csv_report --csv=target/dependencies_report.csv
