#!/usr/bin/env bash

set -euo pipefail

NOOP_MSG="v9.0 does not have a Cloud FIPS release, skipping Cloud FIPS image build."

echo "$NOOP_MSG"

cat <<EOF | buildkite-agent annotate --style "warning" --context kibana-cloud-fips-image

  \`$NOOP_MSG\`
EOF
