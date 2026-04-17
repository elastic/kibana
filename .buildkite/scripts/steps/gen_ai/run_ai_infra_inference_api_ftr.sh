#!/usr/bin/env bash

set -euo pipefail

# This pipeline step needs `vault_get`, which is defined in `vault_fns.sh`.
# Unlike the normal lifecycle entrypoints, this step's command block doesn't
# automatically source it in this shell.
source .buildkite/scripts/common/vault_fns.sh
source .buildkite/scripts/common/util.sh

SOURCE_CLUSTER_CONFIG_B64="$(vault_get ai-infra-ci-docs source-cluster-config)"
SOURCE_CLUSTER_CONFIG_JSON="$(printf '%s' "$SOURCE_CLUSTER_CONFIG_B64" | base64 -d)"

export KIBANA_SOURCE_CLUSTER_URL="$(jq -r '.sourceClusterUrl' <<<"$SOURCE_CLUSTER_CONFIG_JSON")"
export KIBANA_SOURCE_CLUSTER_API_KEY="$(jq -r '.sourceClusterApiKey' <<<"$SOURCE_CLUSTER_CONFIG_JSON")"
export KIBANA_SOURCE_CLUSTER_USERNAME="$(jq -r '.sourceClusterUsername' <<<"$SOURCE_CLUSTER_CONFIG_JSON")"
export KIBANA_SOURCE_CLUSTER_PASSWORD="$(jq -r '.sourceClusterPassword' <<<"$SOURCE_CLUSTER_CONFIG_JSON")"
export KIBANA_SOURCE_INDEX="$(jq -r '.sourceIndex' <<<"$SOURCE_CLUSTER_CONFIG_JSON")"

for var_name in KIBANA_SOURCE_CLUSTER_URL KIBANA_SOURCE_INDEX KIBANA_SOURCE_CLUSTER_API_KEY; do
  value="${!var_name}"
  if [[ -z "$value" || "$value" == "null" ]]; then
    echo "ERROR: $var_name is not set (missing or null in source-cluster-config)." >&2
    exit 1
  fi
done

export FTR_CONFIG="${FTR_CONFIG:-x-pack/platform/test/functional_gen_ai/inference/generate_artifacts.config.ts}"
export FTR_CONFIG_GROUP_KEY="${FTR_CONFIG_GROUP_KEY:-ftr-ai-infra-gen-ai-inference-api}"
export FTR_GEN_AI="${FTR_GEN_AI:-1}"
export FTR_EIS_CCM="${FTR_EIS_CCM:-1}"

.buildkite/scripts/steps/test/ftr_configs.sh

echo "--- Make PR for GenAI ES|QL docs sync update"
.buildkite/scripts/steps/gen_ai/esql_docs_sync.sh


echo "--- Upload GenAI product docs artifacts to GCS"
.buildkite/scripts/steps/gen_ai/upload_kb_artifacts.sh
