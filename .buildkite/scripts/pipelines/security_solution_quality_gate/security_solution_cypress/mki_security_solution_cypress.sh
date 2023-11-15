#!/bin/bash

set -euo pipefail

if [ -z "$1" ]
  then
    echo "No target script from the package.json file, is supplied"
    exit 1
fi

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/functional/common_cypress.sh
.buildkite/scripts/bootstrap.sh

export JOB=kibana-security-solution-chrome

buildkite-agent meta-data set "${BUILDKITE_JOB_ID}_is_test_execution_step" "true"

cd x-pack/test/security_solution_cypress
set +e

if [ -z "${KIBANA_LATEST+x}" ]; then
    KIBANA_OVERRIDE_FLAG=$(buildkite-agent meta-data get kibana_override --default 0)
    echo "OVERRIDING KIBANA FROM CONFIG_PANE : $KIBANA_OVERRIDE_FLAG"
else
    KIBANA_OVERRIDE_FLAG=$KIBANA_LATEST
    echo "OVERRIDING KIBANA FROM TRIGGER : $KIBANA_OVERRIDE_FLAG"
fi

echo "$KIBANA_DOCKER_PASSWORD" | docker login -u "$KIBANA_DOCKER_USERNAME" --password-stdin docker.elastic.co
docker pull docker.elastic.co/kibana-ci/kibana-serverless:latest
echo $(docker inspect docker.elastic.co/kibana-ci/kibana-serverless:latest | jq -r '.[0].Config.Labels."org.label-schema.build-date"')
echo $(docker inspect docker.elastic.co/kibana-ci/kibana-serverless:latest | jq -r '.[0].Config.Labels."org.label-schema.vcs-ref"')
echo $(docker inspect docker.elastic.co/kibana-ci/kibana-serverless:latest | jq -r '.[0].Config.Labels."org.label-schema.vcs-url"')
echo $(docker inspect docker.elastic.co/kibana-ci/kibana-serverless:latest | jq -r '.[0].Config.Labels."org.label-schema.version"')

# QA_API_KEY=$(retry 5 5 vault read -field=qa_api_key secret/kibana-issues/dev/security-solution-qg-enc-key)

# OVERRIDE_KIBANA=$KIBANA_OVERRIDE_FLAG CLOUD_QA_API_KEY=$QA_API_KEY yarn $1; status=$?; yarn junit:merge || :; exit $status