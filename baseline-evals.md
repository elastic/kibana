# Baseline eval + latency evidence (sequential yaml, engine from PR #289957)

Captured 2026-09-14 on worktree ~/dev/kibana.worktrees/parallelize-alert-analysis,
branch parallelize-alert-analysis (PR 289957 head 850a39e6733b merged with upstream/main 9a9e104a7366).
Scout stack: ES :9220, Kibana :5620, EDOT on. Workflow still the OLD sequential (foreach) yaml.

## Eval suite: security-alert-analysis-workflow (8 examples x 5 reps)

Commands (run separately per MUT model):

```
TRACING_ES_URL=http://elastic:changeme@localhost:9220 \
KIBANA_URL=http://elastic:changeme@localhost:5620 \
EVALUATION_CONNECTOR_ID="<mut-connector>" EVALUATION_REPETITIONS=5 \
TEST_RUN_ID=security-alert-analysis-workflow-baseline-<model>-20260914-1310/1317 \
node scripts/evals run --suite security-alert-analysis-workflow \
  --model "<mut-connector>" --judge ".google-gemini-3.1-pro-chat_completion"
```

| MUT model | ClassificationAccuracy | ValidVerdict | criteria mean | Total time |
|---|---|---|---|---|
| anthropic-claude-4.6-sonnet | 1.000 (40/40) | 1.000 (40/40) | 0.71 | 103.74s |
| google-gemini-3.1-pro | 1.000 (40/40) | 1.000 (40/40) | 0.79 | 116.97s |

Context numbers from PR #290140 for the same suite (prior engine): Sonnet 0.97 / 0.97 /
criteria 0.73; Gemini 1.00 / 1.00 / criteria 0.68. Both baseline runs are at or above those
on all three metrics; delta within judge noise. Conclusion: the new engine (PR #289957)
does not regress the suite on the sequential yaml.

## Token medians (per agent_builder span, EDOT traces)

| model (gen_ai.request.model) | n spans | input_tokens median | output_tokens median |
|---|---|---|---|
| anthropic-claude-4.6-sonnet | 26 | 8512 | 224 |
| google-gemini-3.1-pro | 16 | 5697 | 773 |

Caveats: per-call medians (not per-execution sums); the gemini column mixes MUT and judge
calls because judge == MUT in that run; span counts < 40 because cached/no-usage calls emit
no usage attributes.

## Latency benchmark

See baseline-latency-sequential.txt (250 alerts x 5 measured reps + 1 warmup, sequential yaml).
