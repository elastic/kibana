#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

export CI_GROUP="$1"
export JOB=kibana-ciGroup${CI_GROUP}
export KIBANA_INSTALL_DIR="$WORKSPACE/kibana-build-oss"

mv /home/agent/work/kibana-build-oss/kibana-8.0.0-SNAPSHOT-linux-x86_64/* "$KIBANA_INSTALL_DIR/"

checks-reporter-with-killswitch "Functional tests / Group ${CI_GROUP}" yarn run grunt "run:functionalTests_ciGroup${CI_GROUP}";
