#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export CI_GROUP=${CI_GROUP:-$((BUILDKITE_PARALLEL_JOB+1))}
export JOB=kibana-default-ciGroup${CI_GROUP}

echo "--- Default CI Group $CI_GROUP"

cd "$XPACK_DIR"

echo 'logging:
  appenders:
    console:
      type: console
      layout:
        type: pattern
        pattern: "[%date][%level] %message - %meta"
    file:
      type: file
      fileName: /var/lib/buildkite-agent/kibana.log
      layout:
        type: pattern
        pattern: "[%date][%level] %message - %meta"
  root:
    appenders: [default, console, file]
    level: debug' > "$KIBANA_BUILD_LOCATION/config/kibana.yml"

checks-reporter-with-killswitch "X-Pack Chrome Functional tests / Group ${CI_GROUP}" \
  node scripts/functional_tests \
    --bail \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --include-tag "ciGroup$CI_GROUP"

buildkite-agent artifact upload /var/lib/buildkite-agent/kibana.log
