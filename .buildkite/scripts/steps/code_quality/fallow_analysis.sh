#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

FALLOW_VERSION="2.76.0"

SEARCH_DIRS=(
  "x-pack/solutions/search"
  "x-pack/solutions/vectordb"
  "x-pack/solutions/workplaceai"
  "x-pack/platform/plugins/shared/content_connectors"
  "x-pack/platform/plugins/shared/inference"
  "x-pack/platform/plugins/shared/inference_endpoint"
  "x-pack/platform/plugins/shared/inference_workflows"
  "x-pack/platform/plugins/shared/sample_data_ingest"
  "x-pack/platform/plugins/shared/search_inference_endpoints"
  "x-pack/platform/plugins/shared/agent_builder"
  "x-pack/platform/plugins/shared/agent_builder_platform"
  "x-pack/platform/plugins/shared/agent_builder_workflows"
  "x-pack/platform/plugins/shared/agent_context_layer"
)

echo "--- Install fallow v${FALLOW_VERSION}"
npx --yes "fallow@${FALLOW_VERSION}" --version

echo "--- Run fallow dead-code analysis"
set +e
DEAD_CODE_OUTPUT=$(npx "fallow@${FALLOW_VERSION}" dead-code --format json 2>&1)
DEAD_CODE_EXIT=$?
set -e
echo "Exit code: $DEAD_CODE_EXIT"

echo "--- Run fallow duplication analysis"
set +e
DUPES_OUTPUT=$(npx "fallow@${FALLOW_VERSION}" dupes --format json 2>&1)
DUPES_EXIT=$?
set -e
echo "Exit code: $DUPES_EXIT"

echo "--- Run fallow health analysis"
set +e
HEALTH_OUTPUT=$(npx "fallow@${FALLOW_VERSION}" health --format json 2>&1)
HEALTH_EXIT=$?
set -e
echo "Exit code: $HEALTH_EXIT"

echo "--- Post Buildkite annotation"

SCOPED_DIRS=""
for dir in "${SEARCH_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    SCOPED_DIRS+="- \`$dir\`\n"
  fi
done

buildkite-agent annotate --style info --context fallow-report << ANNOTATION
## Fallow Code Quality Report

**Scope (search-kibana + workchat-eng):**
${SCOPED_DIRS}
---
### Dead Code
\`\`\`
${DEAD_CODE_OUTPUT}
\`\`\`

### Duplication
\`\`\`
${DUPES_OUTPUT}
\`\`\`

### Health / Complexity
\`\`\`
${HEALTH_OUTPUT}
\`\`\`
ANNOTATION
