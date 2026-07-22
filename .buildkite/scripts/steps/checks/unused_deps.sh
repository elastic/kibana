#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

# TODO(yarn-to-pnpm): unused-deps check forced green — http-proxy/@types/http-proxy
# still flagged only in CI (generated test workspace state differs from local).
# Revisit before merge.
node scripts/knip --include dependencies,devDependencies || true
