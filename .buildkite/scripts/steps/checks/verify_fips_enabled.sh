#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/download_build_artifacts.sh

echo --- Verify FIPS enabled

NODE_BINARY="$KIBANA_BUILD_LOCATION/node/bin/node"

if [[ -x "$NODE_BINARY" ]]; then
  FIPS_STATUS=$("$NODE_BINARY" --enable-fips --openssl-config="$HOME/nodejs.cnf" -p 'crypto.getFips()' | tr -d '\n')

  if [[ "$FIPS_STATUS" -eq 1 ]]; then
    echo "FIPS enabled successfully"
    exit 0
  else
    echo "Failed to enable FIPS: $FIPS_STATUS"
    exit 1
  fi
else
  echo "Node binary not found at $NODE_BINARY"
  exit 1
fi
