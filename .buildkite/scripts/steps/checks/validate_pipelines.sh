set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check if all pipelines are in locations.yml
cmd="node .buildkite/pipeline-resource-definitions/scripts/fix-location-collection.ts"

eval "$cmd"
check_for_changed_files "$cmd" true

if [[ "${BUILDKITE_PULL_REQUEST_BASE_BRANCH:-}" != "" ]]; then
  echo --- Check if all new pipelines are valid
  git diff "$BUILDKITE_PULL_REQUEST_BASE_BRANCH" --name-only | \
    grep -E '^.buildkite/pipeline-resource-definitions/.*\.yml$' | \
    grep -Ev '(/locations.yml|_templates)' | while read -r pipeline; do
    .buildkite/pipeline-resource-definitions/scripts/validate-pipeline-definition.sh "$pipeline"
  done
fi
