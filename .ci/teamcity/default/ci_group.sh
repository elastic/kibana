#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

export CI_GROUP="$1"
export JOB=kibana-default-ciGroup${CI_GROUP}
export KIBANA_INSTALL_DIR="$WORKSPACE/kibana-build-default"

# mv /home/agent/work/kibana-build-oss/kibana-8.0.0-SNAPSHOT-linux-x86_64/* "$KIBANA_INSTALL_DIR/"

checks-reporter-with-killswitch "Default Distro Chrome Functional tests / Group ${CI_GROUP}" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_INSTALL_DIR" \
    --include-tag "ciGroup$CI_GROUP"
