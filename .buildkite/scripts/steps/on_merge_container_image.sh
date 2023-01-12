#!/bin/bash

set -euo pipefail

cat << EOF | buildkite-agent pipeline upload
steps:
  - trigger: 'kibana-artifacts-container-image'
    async: true
    build:
      branch: '$BUILDKITE_BRANCH'
      commit: '$BUILDKITE_COMMIT'
EOF
