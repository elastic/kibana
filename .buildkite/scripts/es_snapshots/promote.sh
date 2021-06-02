#!/bin/bash

set -euo pipefail

export SNAPSHOT_MANIFEST="${SNAPSHOT_MANIFEST:-"$(buildkite-agent meta-data get SNAPSHOT_MANIFEST)"}"

cat << EOF | buildkite-agent annotate --style "info"
  This promotion is for the following snapshot manifest:

  $SNAPSHOT_MANIFEST
EOF

node "$(dirname "${0}")/promote_manifest.js" "$SNAPSHOT_MANIFEST"
