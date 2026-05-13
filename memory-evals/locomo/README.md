# @memory-evals/locomo

External runner for the [LoCoMo](https://github.com/snap-research/locomo)
long-conversation benchmark. Imports each sample's `session_1..session_N` as
separate Agent Builder conversations (with `speaker_a → user`,
`speaker_b → assistant`), optionally triggers memory extraction, then walks
the `qa[]` list asking each question with `persist: false`.

## Quick start

```sh
cd memory-evals
npm install

export KBN_URL=http://localhost:5601
export KBN_API_KEY=<encoded>
export KBN_AGENT_ID=default
export ANTHROPIC_API_KEY=sk-ant-...
export KBN_JUDGE=auto

# dry-run — no Kibana calls (path is relative to memory-evals/locomo/)
npm run locomo -- --dataset ../../tmp/locomo10.json --samples 1 --questions 5 --dry-run

# 1-sample sanity check, 20 questions
npm run locomo -- --dataset ../../tmp/locomo10.json --samples 1 --questions 20 --run-id 2026-05-13-baseline
```

## CLI

| Flag | Type | Default | Notes |
| --- | --- | --- | --- |
| `--dataset <path>` | string | required | LoCoMo JSON file. |
| `--samples N` | int | all | Take only the first N samples (after `--sample-ids`). |
| `--sample-ids id1,id2` | csv | all | Run only the listed `sample_id` values. |
| `--questions N` | int | all per sample | Cap questions per sample. |
| `--categories 1,2,3,4,5` | csv | all | Filter QA by category. |
| `--max-sessions N` | int | all | Cap sessions ingested per sample (debug). |
| `--run-id <name>` | string | `locomo-<timestamp>` | Used for results dir + state.json id + per-sample agent ids. |
| `--results-dir <path>` | string | `locomo/results` | Override output location. |
| `--no-teardown` | bool | false | Skip `_bulk_delete` at end of run. |
| `--no-memory-extract` | bool | false | Skip `triggerMemoryExtract` even if URL is set. |
| `--dry-run` | bool | false | Load + count sessions/questions, no HTTP calls. |
| `--help` | bool | false | Print usage. |

## Outputs

```
results/<run-id>/
  state.json
  results.json   # category_scores keyed by `cat_<n>`
  summary.md
  raw/<sample_id__slug>.json
```

## Per-sample agents

LoCoMo samples share their conversational history across many questions. The
runner imports each sample under a dedicated agent id
(`eval-locomo-<run-id>-<sample_id>`) so teardown can target only the
per-sample conversations without touching unrelated data on the default
agent. The agent does not need to be pre-registered — the import API just
records the `agent_id` field on each conversation.

## Scoring

Uses the same Anthropic / OpenAI / Noop selector as the LongMemEval runner.
The judge prompts are LoCoMo's 5-category set; category 5 questions are
adversarial and score `yes` when the model **avoids** the adversarial
answer.

## Multimodal turns

A small subset of LoCoMo turns include `blip_caption` / `img_url` instead of
or alongside `text`. The runner flattens them to `[image: <caption>] <text>`
so the assistant still sees the visual context as a string. Categories that
depend on image-only evidence may still under-perform — that's expected.
