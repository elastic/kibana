#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-security-solution-chrome
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- AI Assistant - Security Solution Cypress Tests"

# [test-injection, revert before merge] Force a CypressFailedRunResult for
# prompts.cy.ts to validate the runner-failure handling path in real CI
# (PR #264796). Only affects this one spec in this one job.
export KBN_CYPRESS_INJECT_RUNNER_FAILURE="prompts.cy.ts"

cd x-pack/solutions/security/test/security_solution_cypress

set +e
BK_ANALYTICS_API_KEY=$(vault_get security-solution-ci sec-sol-cypress-bk-api-key)

BK_ANALYTICS_API_KEY=$BK_ANALYTICS_API_KEY yarn cypress:ai_assistant:run:ess; status=$?; yarn junit:merge || :

# Scout reporter
upload_scout_cypress_events "AI Assistant Cypress tests"

exit $status
