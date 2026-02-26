#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo --- Check Types

# scripts/type_check --profile defaults by CI context:
# - PR builds: pr
# - non-PR builds: full
is_pr_build=false
if [[ -n "${BUILDKITE_PULL_REQUEST:-}" && "${BUILDKITE_PULL_REQUEST}" != "false" ]]; then
  is_pr_build=true
fi

if [[ "${is_pr_build}" == "true" ]]; then
  type_check_profile="pr"
else
  type_check_profile="full"
fi

script_args=(--with-archive --profile "${type_check_profile}")

if [[ "${type_check_profile}" == "branch" || "${type_check_profile}" == "pr" ]]; then
  if [[ -n "${GITHUB_PR_MERGE_BASE:-}" ]]; then
    script_args+=(--base-ref "${GITHUB_PR_MERGE_BASE}")
  fi

  if [[ -n "${BUILDKITE_COMMIT:-}" ]]; then
    script_args+=(--head-ref "${BUILDKITE_COMMIT}")
  fi
fi

echo "Running: node scripts/type_check ${script_args[*]}"

node scripts/type_check "${script_args[@]}"
