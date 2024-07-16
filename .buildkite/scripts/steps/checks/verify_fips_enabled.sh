#!/usr/bin/env bash

set -euo pipefail

# This script is part of checks.sh in the PR pipeline but is called directly in the FIPS pipeline, so we need to bootstrap
if [[ -z "${BASH_SOURCE[1]+x}" || "${BASH_SOURCE[1]}" != *"checks.sh"* ]]; then
  export DISABLE_BOOTSTRAP_VALIDATION=false
  .buildkite/scripts/bootstrap.sh
fi

.buildkite/scripts/download_build_artifacts.sh

echo --- Verify FIPS enabled

NODE_BINARY="$KIBANA_BUILD_LOCATION/node/glibc-217/bin/node"

if [[ -x "$NODE_BINARY" ]]; then
  # sed is used to remove invisible ANSI color codes from the output
  FIPS_STATUS=$("$NODE_BINARY" --enable-fips --openssl-config="$HOME/nodejs.cnf" -p 'crypto.getFips()' | sed 's/\x1b\[[0-9;]*m//g' | tr -d \\n)
  echo "$FIPS_STATUS" | od -c

  if [[ "$FIPS_STATUS" == "1" ]]; then
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
