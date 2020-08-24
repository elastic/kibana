#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

export CI_GROUP="$1"
export JOB=kibana-ciGroup${CI_GROUP}
export KIBANA_INSTALL_DIR="$KIBANA_DIR/build/kibana-build-oss"

checks-reporter-with-killswitch "Functional tests / Group ${CI_GROUP}" yarn run grunt "run:functionalTests_ciGroup${CI_GROUP}";
