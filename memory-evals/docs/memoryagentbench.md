# MemoryAgentBench

[MemoryAgentBench](https://arxiv.org/abs/2407.07859) bundles four
memory-task families into one benchmark:

| Code | Family | What it tests |
| --- | --- | --- |
| `AR` | Accurate Retrieval | Pull a specific fact out of a long context. |
| `TTL` | Test-Time Learning | Apply a rule / preference learned earlier. |
| `LRU` | Long-Range Understanding | Multi-hop reasoning across long inputs. |
| `CR` | Conflict Resolution | Pick the latest / authoritative answer when sources disagree. |

MemoryAgentBench is the most varied of the suites; canonical upstream files
ship in several shapes. The loader is permissive about that — see §4.

## 1. Get the dataset

Multiple options:

```sh
# Option A: use the bundled smoke fixture (4 hand-crafted samples — works without a download)
ls memoryagentbench/data/mab_sample.json

# Option B: convert from the upstream Hugging Face / GitHub release into the
# permissive loader shape. Place at ../tmp/mab_full.json.
```

For a structural reference, open [`memoryagentbench/data/mab_sample.json`](../memoryagentbench/data/mab_sample.json).

## 2. Prerequisites

Standard [setup.md](setup.md). LLM-as-judge is strongly recommended — MAB
answers are free-form and substring matching is too brittle.

```sh
export ANTHROPIC_API_KEY=sk-ant-...
export KBN_JUDGE=auto
```

No tool registration required.

## 3. Dry-run first

```sh
npm run memoryagentbench -- \
  --dataset ../memoryagentbench/data/mab_sample.json \
  --dry-run
```

Expected:

```
MemoryAgentBench runner — run_id=mab-<timestamp>
Loaded 4 sample(s).
Selected 4 sample(s) after filters.
DRY RUN — would ingest 4 sample(s), then ask 5 question(s). No Kibana calls made.
```

## 4. Dataset shape

The loader accepts:

```jsonc
// 1. Plain array
[ { "sample_id": ..., "task": "AR", ... }, ... ]

// 2. { samples: [...] } or { data: [...] }
{ "samples": [ ... ] }

// 3. Task-keyed object (one entry per family)
{
  "AR":  [ { ... } ],
  "TTL": [ { ... } ],
  "LRU": [ { ... } ],
  "CR":  [ { ... } ]
}
```

Per sample, you need at least one of:

```jsonc
{
  "sample_id": "mab_ar_0001",                         // optional, auto-generated otherwise
  "task": "AR",                                       // AR | TTL | LRU | CR (aliases ok)
  "title": "Booksum chapter 3",                       // optional
  "context_turns": [                                  // preferred — paired dialogue
    { "role": "user",      "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "context_documents": [                              // OR list of long passages
    "Chapter 1 ...",
    "Chapter 2 ..."
  ],
  // OR a single long "context" string treated as one document
  "qa": [
    { "qa_id": "...", "question": "Who killed Caesar?", "answer": "Brutus" }
  ],
  "metadata": { ... }
}
```

Task-name aliases the loader normalizes:

| Alias | → |
| --- | --- |
| `Accurate Retrieval`, `accurate_retrieval` | `AR` |
| `Test-Time Learning`, `test_time_learning`, `in_context_learning`, `ICL` | `TTL` |
| `Long-Range Understanding`, `long_range_understanding`, `long_range` | `LRU` |
| `Conflict Resolution`, `conflict_resolution` | `CR` |

## 5. Small live run (smoke)

```sh
npm run memoryagentbench -- \
  --dataset ../memoryagentbench/data/mab_sample.json \
  --run-id smoke-$(date +%s) \
  --no-teardown
```

For larger files, use `--samples 10 --tasks AR,LRU` to focus the run.

## 6. Full run

```sh
npm run memoryagentbench -- \
  --dataset ../../tmp/mab_full.json \
  --run-id baseline-2026-05-13
```

For long-context tasks (LRU especially), turn on chunking so each sample is
imported as several smaller conversations:

```sh
npm run memoryagentbench -- \
  --dataset ../../tmp/mab_full.json \
  --session-size 8 \
  --run-id baseline-chunked
```

With `--session-size 8`, paired turns are split into 8-round chunks; each
chunk becomes its own conversation under the same `sample_id`. Use
`--max-sessions N` to cap how many chunks are actually imported per sample
(debug).

## 7. Flag reference

| Flag | Effect |
| --- | --- |
| `--samples N` | First N samples (after `--sample-ids`). |
| `--sample-ids id1,id2` | Run only listed sample ids. |
| `--tasks AR,LRU` | Filter by normalized task code (csv). |
| `--questions N` | Cap questions **per sample**. |
| `--session-size N` | Chunk paired turns into N-round sessions. Default 0 = one conv per sample. |
| `--max-sessions N` | Cap sessions imported per sample (debug). |
| `--run-id <name>` | Resume / namespace. |
| `--no-teardown` | Keep imported conversations. |
| `--no-memory-extract` | Skip memory-extract POST. |
| `--results-dir <path>` | Override output location. |
| `--dry-run` | Plan only. |

Full reference: `memoryagentbench/README.md`.

## 8. What the runner does per sample

1. **Plan** — convert `context_turns` (or `context_documents` synthetic
   rounds with `(prior context)` user turns) into `ImportRound[]`. With
   `--session-size N`, split into N-round chunks.
2. **Import** — one or more conversations per sample, deterministic ids
   `sha256(run_id + sample_id + chunk_idx)`.
3. **Memory extract** per session (optional).
4. **Ask** — for each QA pair, `converse(persist: false)`.
5. **Score** — judge with the task-specific prompt:
   - AR: "is this fact recovered?"
   - TTL: "is the learned rule applied?"
   - LRU: "does the final answer match?"
   - CR: "did the model pick the authoritative answer?"
6. **Checkpoint** + raw dump.
7. **Teardown** — `_bulk_delete` by `agent_id` + `created_after`.

## 9. Reading results

`category_scores` is keyed by `AR | TTL | LRU | CR`. The summary breaks each
out:

```jsonc
{
  "category_scores": {
    "AR":  { "correct": 8,  "partial": 1,  "total": 10, "accuracy": 80.0 },
    "TTL": { "correct": 3,  "partial": 2,  "total": 8,  "accuracy": 37.5 },
    "LRU": { "correct": 4,  "partial": 1,  "total": 8,  "accuracy": 50.0 },
    "CR":  { "correct": 6,  "partial": 0,  "total": 8,  "accuracy": 75.0 }
  }
}
```

TTL is usually the weakest family — the agent must reuse rules introduced
in earlier turns and applies them later. Inspect `raw/<id>.json` to see
whether the predicted answer is wrong vs the rule not being recalled.

See [results.md](results.md) for the full schema.

## 10. Common pitfalls

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `missing or unknown task ("Accurate Retrieval")` | Task label not normalized | Already supported — make sure dataset version matches loader (run `npm test`). |
| `missing context_turns / context_documents / context` | Sample lacks any context source | Add either a `context_turns` array or a `context` / `context_documents` field. |
| All TTL questions get `partial` | Agent partially recalls but doesn't apply the rule | Inspect `raw/<id>.json` — usually a prompt-engineering issue. |
| One LRU sample dominates runtime | Sample has hundreds of documents | Use `--session-size 8 --max-sessions 20`. |

More in [troubleshooting.md](troubleshooting.md).
