#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

SERVERLESS_BASELINE="packages/kbn-api-contracts/baselines/serverless/current.yaml"
STACK_BASELINES_PATTERN="packages/kbn-api-contracts/baselines/stack/"
BREAKING_CHANGE_LABEL="breaking-change-approved"

check_baseline_governance() {
  if ! is_pr; then
    return 0
  fi

  set_git_merge_base

  local changed_files
  changed_files="$(git diff --name-only "$GITHUB_PR_MERGE_BASE"...HEAD)"

  if echo "$changed_files" | grep -q "^${SERVERLESS_BASELINE}$"; then
    echo "❌ ERROR: Serverless API baseline may only be updated by the post-promotion pipeline."
    echo ""
    echo "The file '$SERVERLESS_BASELINE' cannot be modified in a PR."
    echo "If you need to update the serverless baseline, please coordinate with the release team."
    exit 1
  fi

  if echo "$changed_files" | grep -q "^${STACK_BASELINES_PATTERN}"; then
    if ! is_pr_with_label "$BREAKING_CHANGE_LABEL"; then
      echo "❌ ERROR: Stack API baseline modifications require the '$BREAKING_CHANGE_LABEL' label."
      echo ""
      echo "This PR modifies stack API baselines which indicates a breaking change."
      echo "Please:"
      echo "  1. Ensure this breaking change has been approved"
      echo "  2. Add the '$BREAKING_CHANGE_LABEL' label to this PR"
      echo "  3. Re-run this check"
      exit 1
    fi
    echo "✅ Stack baseline modifications detected with '$BREAKING_CHANGE_LABEL' label - proceeding."
  fi
}

echo --- Check API Contracts Baseline Governance
check_baseline_governance

export DISABLE_BOOTSTRAP_VALIDATION=false
.buildkite/scripts/bootstrap.sh

echo --- Check API Contracts

KIBANA_VERSION="$(jq -r '.version' package.json)"

echo "Checking stack API contracts..."
node packages/kbn-api-contracts/scripts/check_contracts \
  --distribution stack \
  --specPath oas_docs/output/kibana.yaml \
  --version "$KIBANA_VERSION"

echo "Checking serverless API contracts..."
node packages/kbn-api-contracts/scripts/check_contracts \
  --distribution serverless \
  --specPath oas_docs/output/kibana.serverless.yaml
