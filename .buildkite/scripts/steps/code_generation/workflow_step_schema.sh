#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Generate workflow step schema artifact

# The generation is a task masked as a Jest integration test: it boots a real
# (oss:false) Kibana and (re)writes the committed artifact under the CLI
# package's `generated/` dir. It is excluded from the general jest_integration
# lane (see .buildkite/disabled_jest_configs.json) and only runs here, so any
# drift is auto-committed back to the PR (the moon.yml pattern).
GENERATE_CMD="node scripts/jest_integration --config src/platform/packages/private/kbn-workflow-step-schema-cli/integration_tests/jest.integration.config.js"

$GENERATE_CMD

check_for_changed_files "$GENERATE_CMD" true
