#!/bin/bash

set -euo pipefail

export ES_SNAPSHOT_MANIFEST="${ES_SNAPSHOT_MANIFEST:-"$(buildkite-agent meta-data get ES_SNAPSHOT_MANIFEST)"}"

cat << EOF | buildkite-agent annotate --style "info"
  This promotion is for the following snapshot manifest:

  $ES_SNAPSHOT_MANIFEST
EOF

node "$(dirname "${0}")/promote_manifest.js" "$ES_SNAPSHOT_MANIFEST"
