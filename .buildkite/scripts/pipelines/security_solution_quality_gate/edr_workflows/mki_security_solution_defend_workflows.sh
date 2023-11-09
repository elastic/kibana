#!/bin/bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/functional/common_cypress.sh
.buildkite/scripts/bootstrap.sh

export JOB=kibana-defend-workflows-serverless-cypress

cd x-pack/plugins/security_solution
set +e

QA_API_KEY=$(retry 5 5 vault read -field=qa_api_key secret/kibana-issues/dev/security-solution-qg-enc-key)

CLOUD_QA_API_KEY=$QA_API_KEY yarn cypress:dw:qa:serverless:run; status=$?; yarn junit:merge || :; exit $status