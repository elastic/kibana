# @memory-evals/longmemeval

External runner for the [LongMemEval](https://github.com/xiaowu0162/LongMemEval)
benchmark. Imports every haystack session of every selected question as its
own Agent Builder conversation, optionally triggers memory extraction, then
asks the question through `/api/agent_builder/converse` with `persist: false`.

## Quick start

```sh
cd memory-evals
npm install

export KBN_URL=http://localhost:5601
export KBN_API_KEY=<encoded>
export KBN_AGENT_ID=default
export ANTHROPIC_API_KEY=sk-ant-...
export KBN_JUDGE=auto   # use Anthropic if key set, else record predictions only

# dry-run — no Kibana calls (path is relative to memory-evals/longmemeval/)
npm run longmemeval -- --dataset ../../tmp/longmemeval_s.json --questions 5 --dry-run

# 50-question sample
npm run longmemeval -- --dataset ../../tmp/longmemeval_s.json --questions 50 --run-id 2026-05-13-baseline
```

## CLI

| Flag | Type | Default | Notes |
| --- | --- | --- | --- |
| `--dataset <path>` | string | required | LongMemEval JSON file (S/M/Oracle). |
| `--questions N` | int | all | Take only the first N matching questions. |
| `--question-types t1,t2` | csv | all | Filter by `question_type` (e.g. `single-session-user,multi-session`). |
| `--question-ids id1,id2` | csv | all | Run only the listed question_ids. |
| `--run-id <name>` | string | `lme-<timestamp>` | Used for results dir + state.json id. |
| `--results-dir <path>` | string | `longmemeval/results` | Override output location. |
| `--no-teardown` | bool | false | Skip `_bulk_delete` at end of run. |
| `--no-memory-extract` | bool | false | Skip `triggerMemoryExtract` even if URL is set. |
| `--dry-run` | bool | false | Load + pair the dataset and stop. No HTTP calls. |
| `--help` | bool | false | Print usage. |

## Outputs

```
results/<run-id>/
  state.json         # resumable checkpoint
  results.json       # final RunSummary (matches existing longmemeval_results shape)
  summary.md         # one-page summary
  raw/<question_id>.json   # raw converse payload + final result
```

## Scoring

The runner uses one of three judges:

- `KBN_JUDGE=anthropic` → Anthropic Messages API (default model `claude-sonnet-4-5`).
- `KBN_JUDGE=openai` → OpenAI Chat Completions (default model `gpt-4o-mini`).
- `KBN_JUDGE=none` → `NoopJudge`; predictions are recorded but `score=null`.
- `KBN_JUDGE=auto` (default) → Anthropic if `ANTHROPIC_API_KEY` is set, else OpenAI if `OPENAI_API_KEY`, else NoopJudge.

The judge prompts match the upstream LongMemEval evaluator (one template per
`question_type`).
