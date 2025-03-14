#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check for NPM dependencies missing owners
node scripts/dependency_ownership.js --missingOwner --failIfUnowned
