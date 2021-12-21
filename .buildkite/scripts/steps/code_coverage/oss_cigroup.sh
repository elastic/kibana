
   
#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

node scripts/build_kibana_platform_plugins.js --no-cache

export CI_GROUP=${CI_GROUP:-$((BUILDKITE_PARALLEL_JOB+1))}
export JOB=kibana-oss-ciGroup${CI_GROUP}

echo "--- OSS CI Group $CI_GROUP"
echo " -> Running Functional tests with code coverage"
export NODE_OPTIONS=--max_old_space_size=8192
export CODE_COVERAGE=1

node scripts/functional_tests \
  --include-tag "ciGroup$CI_GROUP" \
  --exclude-tag "skipCoverage" || true

if [[ -d "$KIBANA_DIR/target/kibana-coverage/functional" ]]; then
  echo "--- Merging code coverage for CI Group $CI_GROUP"
  yarn nyc report --nycrc-path src/dev/code_coverage/nyc_config/nyc.functional.config.js --reporter json
  rm -rf target/kibana-coverage/functional/*
  mv target/kibana-coverage/functional-combined/coverage-final.json "target/kibana-coverage/functional/oss-${CI_GROUP}-coverage.json"
else
  echo "--- Code coverage not found"
fi