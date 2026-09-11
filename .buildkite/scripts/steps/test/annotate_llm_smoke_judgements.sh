#!/usr/bin/env bash

# Surfaces LLM smoke-test failures that the LLM judge triaged (see
# @kbn/gen-ai-functional-testing llm_failure_judge) as a build annotation,
# so provider-caused skips stay visible and can be monitored.

set -euo pipefail

JUDGEMENTS_FILE="target/llm_smoke_judgements.jsonl"

if [[ ! -s "$JUDGEMENTS_FILE" ]]; then
  echo "No LLM smoke judgements recorded"
  exit 0
fi

echo "--- Annotating LLM smoke judgements"

{
  echo "#### LLM smoke-test failures triaged by LLM judge"
  echo ""
  echo "Failures with verdict \`provider\` were skipped instead of failing the build. Verdicts \`code\` / \`unknown\` failed normally."
  echo ""
  echo "| Target | Scenario | Verdict | Judge | Reason |"
  echo "| --- | --- | --- | --- | --- |"
  jq -r '
    [.target, .scenario, .verdict, (.judgeInferenceId // "-"), .reason]
    | map(tostring | gsub("\\|"; "\\\\|") | gsub("\n"; " "))
    | "| " + join(" | ") + " |"
  ' "$JUDGEMENTS_FILE"
} | buildkite-agent annotate --style warning --context llm-smoke-judgements ||
  echo "Failed to create LLM smoke judgements annotation"
