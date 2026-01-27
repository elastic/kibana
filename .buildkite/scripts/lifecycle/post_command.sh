#!/usr/bin/env bash

set -euo pipefail

echo '--- Log out of gcloud'
./.buildkite/scripts/common/activate_service_account.sh --unset-impersonation || echo "Failed to unset impersonation"
./.buildkite/scripts/common/activate_service_account.sh --logout-gcloud || echo "Failed to log out of gcloud"

IS_TEST_EXECUTION_STEP="$(buildkite-agent meta-data get "${BUILDKITE_JOB_ID}_is_test_execution_step" --default '')"

if [[ "$IS_TEST_EXECUTION_STEP" == "true" ]]; then
  echo "--- Upload Artifacts"
  buildkite-agent artifact upload '**/.scout/test-artifacts/**/*.png'
  buildkite-agent artifact upload '.scout/reports/scout-playwright-test-failures-*/**/*'
  buildkite-agent artifact upload '.scout/reports/scout-playwright-test-failures-*/scout-failures-*.ndjson'
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
  buildkite-agent artifact upload 'src/platform/test/**/screenshots/diff/*.png'
  buildkite-agent artifact upload 'src/platform/test/**/screenshots/failure/*.png'
  buildkite-agent artifact upload 'src/platform/test/**/screenshots/session/*.png'
  buildkite-agent artifact upload 'src/platform/test/functional/failure_debug/html/*.html'
  buildkite-agent artifact upload 'x-pack/platform/test/**/screenshots/diff/*.png'
  buildkite-agent artifact upload 'x-pack/platform/test/**/screenshots/failure/*.png'
  buildkite-agent artifact upload 'x-pack/platform/test/**/screenshots/session/*.png'
  buildkite-agent artifact upload 'x-pack/platform/test/functional/failure_debug/html/*.html'
  buildkite-agent artifact upload 'x-pack/platform/test/serverless/**/screenshots/diff/*.png'
  buildkite-agent artifact upload 'x-pack/platform/test/serverless/**/screenshots/failure/*.png'
  buildkite-agent artifact upload 'x-pack/platform/test/serverless/**/screenshots/session/*.png'
  buildkite-agent artifact upload 'x-pack/platform/test/serverless/**/failure_debug/html/*.html'
  buildkite-agent artifact upload '.es/**/*.hprof'
  buildkite-agent artifact upload 'data/es_debug_*.tar.gz'
  buildkite-agent artifact upload '.es/es*.log'
  buildkite-agent artifact upload '.es/uiam*.log'

  if [[ $BUILDKITE_COMMAND_EXIT_STATUS -ne 0 ]]; then
    if [[ $BUILDKITE_TRIGGERED_FROM_BUILD_PIPELINE_SLUG == 'elasticsearch-serverless-intake' ]]; then
      echo "--- Run Failed Test Reporter (only junit)"
      node scripts/report_failed_tests --build-url="${BUILDKITE_BUILD_URL}#${BUILDKITE_JOB_ID}" 'target/junit/**/*.xml'\
        --no-github-update --no-index-errors
    else
      echo "--- Run Failed Test Reporter"
      node scripts/report_failed_tests --build-url="${BUILDKITE_BUILD_URL}#${BUILDKITE_JOB_ID}" \
        'target/junit/**/*.xml' \
        '.scout/reports/scout-playwright-test-failures-*/scout-failures-*.ndjson'
    fi
  fi

  if [[ -d 'target/test_failures' ]]; then
    buildkite-agent artifact upload 'target/test_failures/**/*'
    ts-node .buildkite/scripts/lifecycle/annotate_test_failures.ts
  fi

  if [[ -d 'target/agent_diagnostics' ]]; then
    buildkite-agent artifact upload 'target/agent_diagnostics/**/*'
  fi

fi

if [[ $BUILDKITE_COMMAND_EXIT_STATUS -ne 0 ]]; then
  # If the slack team environment variable is set, ping the team in slack
  if [ -n "${PING_SLACK_TEAM:-}" ]; then
    buildkite-agent meta-data set 'slack:ping_team:body' "${PING_SLACK_TEAM}, can you please take a look at the test failures?"
  fi
fi
