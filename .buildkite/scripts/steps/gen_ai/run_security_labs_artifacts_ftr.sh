#!/usr/bin/env bash

set -euo pipefail

# The Security Labs builder reads published articles from the Contentstack Content
# Delivery API, which requires the stack API key and a read-only delivery token.
source .buildkite/scripts/steps/gen_ai/security_labs_contentstack_credentials.sh
for var in SECURITY_LABS_CONTENTSTACK_API_KEY SECURITY_LABS_CONTENTSTACK_DELIVERY_TOKEN; do
  if [[ -z "${!var:-}" || "${!var}" == "null" ]]; then
    echo "ERROR: $var is not set; cannot fetch Security Labs content from Contentstack." >&2
    exit 1
  fi
done

# Artifact version must be unique per publish so same-day updates are not skipped by
# already-installed clusters. Prefer a caller-provided UTC timestamp (YYYY.MM.DD-HHMMSS);
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

# security_labs_content_gate.sh compares webhook builds against the newest build with this marker.
buildkite-agent meta-data set security-labs-uploaded true
