#!/usr/bin/env bash

set -euo pipefail

echo '--- Log out of gcloud'
./.buildkite/scripts/common/activate_service_account.sh --unset-impersonation || echo "Failed to unset impersonation"
./.buildkite/scripts/common/activate_service_account.sh --logout-gcloud || echo "Failed to log out of gcloud"

if [[ "${SKIP_NODE_SETUP:-}" =~ ^(1|true)$ ]]; then
  echo '--- Skipping Agent Debug Info'
else
  echo '--- Agent Debug Info'
  ts-node .buildkite/scripts/lifecycle/print_agent_links.ts || true
fi

IS_TEST_EXECUTION_STEP="$(buildkite-agent meta-data get "${BUILDKITE_JOB_ID}_is_test_execution_step" --default '')"

if [[ "$IS_TEST_EXECUTION_STEP" == "true" ]]; then
  echo "--- Upload Artifacts"
  buildkite-agent artifact upload 'target/junit/**/*'
  buildkite-agent artifact upload 'target/kibana-coverage/jest/**/*'
  buildkite-agent artifact upload 'target/kibana-coverage/functional/**/*'
  buildkite-agent artifact upload 'target/kibana-*'
  buildkite-agent artifact upload 'target/kibana-security-solution/**/*.png'
  buildkite-agent artifact upload 'target/kibana-security-solution/**/management/**/*.mp4'
  buildkite-agent artifact upload 'target/kibana-osquery/**/*.png'
  buildkite-agent artifact upload 'target/kibana-osquery/**/*.mp4'
  buildkite-agent artifact upload 'target/kibana-fleet/**/*.png'
  buildkite-agent artifact upload 'target/test-metrics/*'
  buildkite-agent artifact upload 'target/test-suites-ci-plan.json'
  buildkite-agent artifact upload 'test/**/screenshots/diff/*.png'
  buildkite-agent artifact upload 'test/**/screenshots/failure/*.png'
  buildkite-agent artifact upload 'test/**/screenshots/session/*.png'
  buildkite-agent artifact upload 'test/functional/failure_debug/html/*.html'
  buildkite-agent artifact upload 'x-pack/test/**/screenshots/diff/*.png'
  buildkite-agent artifact upload 'x-pack/test/**/screenshots/failure/*.png'
  buildkite-agent artifact upload 'x-pack/test/**/screenshots/session/*.png'
  buildkite-agent artifact upload 'x-pack/test_serverless/**/screenshots/failure/*.png'
  buildkite-agent artifact upload 'x-pack/test_serverless/**/screenshots/session/*.png'
  buildkite-agent artifact upload 'x-pack/test_serverless/**/failure_debug/html/*.html'
  buildkite-agent artifact upload 'x-pack/test/functional/apps/reporting/reports/session/*.pdf'
  buildkite-agent artifact upload 'x-pack/test/functional/failure_debug/html/*.html'
  buildkite-agent artifact upload '.es/**/*.hprof'
  buildkite-agent artifact upload 'data/es_debug_*.tar.gz'

  if [[ $BUILDKITE_COMMAND_EXIT_STATUS -ne 0 ]]; then
    echo "--- Run Failed Test Reporter"
    node scripts/report_failed_tests --build-url="${BUILDKITE_BUILD_URL}#${BUILDKITE_JOB_ID}" 'target/junit/**/*.xml'
  fi

  if [[ -d 'target/test_failures' ]]; then
    buildkite-agent artifact upload 'target/test_failures/**/*'
    ts-node .buildkite/scripts/lifecycle/annotate_test_failures.ts
  fi
fi
