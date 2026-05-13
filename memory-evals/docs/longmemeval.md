# LongMemEval

[LongMemEval](https://github.com/xiaowu0162/LongMemEval) is the gold-standard
long-context memory benchmark: 500 questions over multi-session histories
(~100 sessions per question in the `_s` split, ~500 in `_m`). It exercises
five reasoning types — single-session-user, single-session-assistant,
multi-session, temporal, knowledge-update — plus an abstention class.

## 1. Get the dataset

```sh
mkdir -p tmp
# from inside memory-evals/
curl -L -o ../tmp/longmemeval_s.json \
  https://huggingface.co/datasets/xiaowu0162/longmemeval_s/resolve/main/longmemeval_s.json
```

Place the file under `tmp/` at the Kibana repo root (`memory-evals/`'s
parent's parent). The runner expects paths *relative to the runner's
package directory*, so the canonical path is `../../tmp/longmemeval_s.json`.

Larger splits (`longmemeval_m.json`, `longmemeval_oracle.json`) use the same
schema; swap the path. Watch for memory pressure — the `_m` split contains
multi-megabyte JSON.

## 2. Prerequisites

Follow [setup.md](setup.md). You need:

- `KBN_URL`, `KBN_API_KEY` (or basic auth)
- `KBN_AGENT_ID` — a memory-enabled agent
- (Optional) `ANTHROPIC_API_KEY` and `KBN_JUDGE=auto` for LLM scoring

LongMemEval does not need tools — any chat agent works.

## 3. Dry-run first

```sh
npm run longmemeval -- \
  --dataset ../../tmp/longmemeval_s.json \
  --questions 3 \
  --dry-run
```

Expected output:

```
LongMemEval runner — run_id=lme-<timestamp>
Loaded 500 question(s).
Selected 3 question(s) after filters.
DRY RUN — would ingest 148 session(s) across 3 question(s). No Kibana calls made.
```

If you see `Loaded 0`, the file path is wrong. If `Selected 0`, your filters
exclude everything.

## 4. Small live run (smoke)

```sh
npm run longmemeval -- \
  --dataset ../../tmp/longmemeval_s.json \
  --questions 5 \
  --run-id smoke-$(date +%s) \
  --no-teardown
```

`--no-teardown` keeps the imported conversations so you can inspect them in
the Kibana Agent Builder UI. Re-run with `--no-teardown` removed to clean
them up:

```sh
npm run longmemeval -- \
  --dataset ../../tmp/longmemeval_s.json \
  --questions 5 \
  --run-id smoke-<same-timestamp>
```

Re-running with the same `--run-id` resumes from `state.json`: completed
questions are reported as `cached` and only new work hits Kibana.

## 5. Full run

```sh
npm run longmemeval -- \
  --dataset ../../tmp/longmemeval_s.json \
  --run-id baseline-2026-05-13
```

A full `_s` run is 500 questions × ~50 imports + 1 converse each. Expect
~hours depending on Kibana + connector latency. The runner checkpoints
after every question, so SIGINT is safe — re-run with the same `--run-id` to
continue.

## 6. Useful filters

| Flag | Effect |
| --- | --- |
| `--questions N` | First N questions only. Cheapest way to size-test. |
| `--question-ids id1,id2` | Re-score a specific subset (csv). |
| `--question-types single-session-user,knowledge-update` | Filter by LongMemEval `question_type`. |
| `--no-memory-extract` | Skip the optional memory-extract POST. |
| `--no-teardown` | Keep imported conversations after the run. |
| `--results-dir <path>` | Override `longmemeval/results/`. |
| `--help` | Full flag list. |

See `longmemeval/README.md` for the canonical flag reference.

## 7. What the runner does per question

1. **Plan** — read `haystack_sessions` (list of session-list-of-turns), pair
   alternating user/assistant turns into `ImportRound[]`, one conversation
   per session.
2. **Import** — `POST /internal/agent_builder/conversations/_import` once per
   session with a deterministic id
   (`sha256(run_id + question_id + session_idx)`). Mode is `overwrite`, so
   reruns are idempotent.
3. **Memory extract** — `POST $KBN_MEMORY_EXTRACT_URL` (optional, no-op if
   unset).
4. **Ask** — `POST /api/agent_builder/converse` with `persist: false` and
   the question. The agent has only memory (no history reuse) to ground
   from.
5. **Score** — feed `{question, gold_answer, predicted_answer, category}` to
   the judge with the LongMemEval prompt. Anthropic → yes/partial/no → 1 /
   0.5 / 0. NoopJudge leaves `score: null`.
6. **Checkpoint** — append the result to `state.json` (atomic write).
7. **Raw dump** — write `raw/<question_id>.json` with the converse payload,
   judge reason, etc.

## 8. Reading results

See [results.md](results.md) for the full schema. Quick summary:

```
longmemeval/results/<run-id>/
  state.json     # checkpoint
  results.json   # final QuestionResult[] + summary
  summary.md     # human-readable
  raw/<id>.json  # per-question converse + score
```

The summary breaks accuracy out by `question_type` so you can spot
e.g. temporal questions tanking the score.

## 9. Common pitfalls

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `ENOENT: ...longmemeval_s.json` | Wrong relative path | The runner runs from `memory-evals/longmemeval/`; use `../../tmp/longmemeval_s.json` |
| `403 Forbidden` on first import | API key lacks `agentBuilder:write` | See [setup.md §2](setup.md). |
| All scores `null` | `KBN_JUDGE=none` or no API key found | Set `ANTHROPIC_API_KEY` or `KBN_JUDGE=auto` with a key. |
| Mid-run crash, resume re-asks completed questions | `state.json` was deleted | Reruns *must* preserve the results directory. |

More in [troubleshooting.md](troubleshooting.md).
