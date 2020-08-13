#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

export CI_GROUP="$1"

export CI_PARALLEL_PROCESS_NUMBER=1
export JOB=kibana-ciGroup${CI_GROUP}
export GCS_UPLOAD_PREFIX=ehwihsihfiashdhfshfso

mv /home/agent/work/kibana-build-oss/kibana-8.0.0-SNAPSHOT-linux-x86_64/* "$WORKSPACE/kibana-build-oss/"
export KIBANA_INSTALL_DIR="$WORKSPACE/kibana-build-oss"

# TODO add checks-reporter-with-killswitch "Functional tests / Group ${CI_GROUP}"
yarn run grunt "run:functionalTests_ciGroup${CI_GROUP}";
