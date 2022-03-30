#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo "--- Build Kibana Distribution"
node scripts/build --all-platforms --debug --docker-cross-compile --skip-docker-cloud

echo "--- Build dependencies report"
node scripts/licenses_csv_report --csv=target/dependencies_report.csv

echo "--- Extract default i18n messages"
mkdir -p target/i18n
node scripts/i18n_extract
buildkite-agent artifact upload "target/i18n/en.json"
