#!/usr/bin/env bash

set -euo pipefail

# This pipeline step needs `vault_get`, which is defined in `vault_fns.sh`.
# Unlike the normal lifecycle entrypoints, this step's command block doesn't
# automatically source it in this shell.
source .buildkite/scripts/common/vault_fns.sh
source .buildkite/scripts/common/util.sh

# The Security Labs builder fetches article markdown from the internal
# elastic/security-labs-elastic-co repository, which requires a GitHub token.
# setup_job_env.sh already exports GITHUB_TOKEN from Vault during the lifecycle,
# but fall back to fetching it directly if it is missing.
if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  export GITHUB_TOKEN="$(vault_get kibanamachine github_token)"
fi

if [[ -z "${GITHUB_TOKEN:-}" || "${GITHUB_TOKEN}" == "null" ]]; then
  echo "ERROR: GITHUB_TOKEN is not set; cannot fetch Security Labs content from GitHub." >&2
  exit 1
fi

# Git ref of elastic/security-labs-elastic-co to build content from.
# Prefer a commit SHA from the article-publish Buildkite trigger; defaults to main.
export SECURITY_LABS_REPO_REF="${SECURITY_LABS_REPO_REF:-main}"

# Artifact version must be unique per publish so same-day updates are not skipped by
# already-installed clusters. Prefer the trigger's UTC timestamp (YYYY.MM.DD-HHMMSS);
# when unset, the FTR/builder defaults to the current UTC timestamp.
if [[ -n "${SECURITY_LABS_VERSION:-}" ]]; then
  export SECURITY_LABS_VERSION
fi

export FTR_CONFIG="${FTR_CONFIG:-x-pack/platform/test/functional_gen_ai/inference/generate_security_labs_artifacts.config.ts}"
export FTR_CONFIG_GROUP_KEY="${FTR_CONFIG_GROUP_KEY:-ftr-ai-infra-gen-ai-security-labs}"
export FTR_GEN_AI="${FTR_GEN_AI:-1}"
export FTR_EIS_CCM="${FTR_EIS_CCM:-1}"

.buildkite/scripts/steps/test/ftr_configs.sh

echo "--- Upload Security Labs KB artifacts to GCS"
.buildkite/scripts/steps/gen_ai/upload_kb_artifacts.sh
