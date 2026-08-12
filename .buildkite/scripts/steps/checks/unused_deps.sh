#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

# Config hints are suppressed on purpose: knip suggests dropping the http-proxy /
# @types/http-proxy ignores because it can trace them locally, but they are only
# consumed by kbnGenerated packages (no dependency manifest) via root hoisting, so
# CI's partial graph still flags them. See knip.jsonc ignoreDependencies.
node scripts/knip --include dependencies,devDependencies --no-config-hints
