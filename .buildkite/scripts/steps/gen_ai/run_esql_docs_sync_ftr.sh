#!/usr/bin/env bash

set -euo pipefail

export FTR_CONFIG="${FTR_CONFIG:-x-pack/platform/test/functional_gen_ai/inference/generate_esql_docs.config.ts}"
export FTR_CONFIG_GROUP_KEY="${FTR_CONFIG_GROUP_KEY:-ftr-ai-infra-gen-ai-esql-docs}"
export FTR_GEN_AI="${FTR_GEN_AI:-1}"
export FTR_EIS_CCM="${FTR_EIS_CCM:-1}"
export ESQL_DOCS_INFERENCE_ID="${ESQL_DOCS_INFERENCE_ID:-.openai-gpt-5.5-chat_completion}"

.buildkite/scripts/steps/test/ftr_configs.sh

echo "--- Make PR for GenAI ES|QL docs sync update"
.buildkite/scripts/steps/gen_ai/esql_docs_sync.sh
