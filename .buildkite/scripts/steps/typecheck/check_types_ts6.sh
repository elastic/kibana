#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo --- "Check Types (TS 6 canary)"

# Run the existing type-check pipeline with the TS 6 alias as the tsc binary.
# Soft-fail and no GCS cache: this lane must never block PRs nor pollute the
# shared 5.9.3 type-check archive. The orchestrator injects
# `ignoreDeprecations: "6.0"` when KBN_TS_COMPILER_PACKAGE is set, so this
# surfaces real type errors instead of the soft deprecations that will be
# removed in TS 7.0.
KBN_TS_COMPILER_PACKAGE=typescript-6 node scripts/type_check
