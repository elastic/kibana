set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check if all pipelines are in locations.yml
cmd="ts-node .buildkite/pipeline-resource-definitions/scripts/fix-location-collection.ts"

eval "$cmd"
check_for_changed_files "$cmd" true

if [[ "${BUILDKITE_PULL_REQUEST_BASE_BRANCH:-}" != "" ]]; then
  echo --- Check if all new pipelines are valid
  AFFECTED_PIPELINES=$(git diff "$BUILDKITE_PULL_REQUEST_BASE_BRANCH" --name-only | \
    grep -E '^.buildkite/pipeline-resource-definitions/.*\.yml$' | \
    grep -Ev '(/locations.yml|_templates)' || true)
  echo "Pipelines affected by this PR: $AFFECTED_PIPELINES"

  for pipeline in $AFFECTED_PIPELINES; do
    if [[ ! -f "$pipeline" ]]; then
      echo "Pipeline file not found: $pipeline - probably deleted. Skipping validation."
    else
      .buildkite/pipeline-resource-definitions/scripts/validate-pipeline-definition.sh "$pipeline"
    fi
  done
fi

exit 0
