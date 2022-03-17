#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/build_kibana_plugins.sh

is_test_execution_step


export CI_GROUP=${CI_GROUP:-$((BUILDKITE_PARALLEL_JOB+1))}
export JOB=kibana-default-ciGroup${CI_GROUP}

export NODE_OPTIONS=--max_old_space_size=8192
export CODE_COVERAGE=1

echo "--- Default CI Group $CI_GROUP"

echo " -> Running X-Pack functional tests with code coverage"

cd "$XPACK_DIR"

NODE_OPTIONS=--max_old_space_size=14336 \
  ./../node_modules/.bin/nyc \
  --nycrc-path ./../src/dev/code_coverage/nyc_config/nyc.server.config.js \
  node scripts/functional_tests \
  --include-tag "ciGroup$CI_GROUP" \
  --exclude-tag "skipCoverage" || true

cd "$KIBANA_DIR"

if [[ -d "$KIBANA_DIR/target/kibana-coverage/server" ]]; then
  echo "--- Server side code coverage collected"
  mkdir -p target/kibana-coverage/functional
  mv target/kibana-coverage/server/coverage-final.json "target/kibana-coverage/functional/xpack-${CI_GROUP}-server-coverage.json"
fi

if [[ -d "$KIBANA_DIR/target/kibana-coverage/functional" ]]; then
  echo "--- Merging code coverage for CI Group $CI_GROUP"
  yarn nyc report --nycrc-path src/dev/code_coverage/nyc_config/nyc.functional.config.js --reporter json
  rm -rf target/kibana-coverage/functional/*
  mv target/kibana-coverage/functional-combined/coverage-final.json "target/kibana-coverage/functional/xpack-${CI_GROUP}-coverage.json"
else
  echo "--- Code coverage not found"
fi

cd "$KIBANA_DIR"