# @memory-evals/memoryagentbench

External runner for the [MemoryAgentBench](https://arxiv.org/abs/2407.07859)
suite of memory tasks (Accurate Retrieval, Test-Time Learning, Long-Range
Understanding, Conflict Resolution).

## Dataset shape (flexible)

The loader accepts any of these top-level wrappers:

```jsonc
// 1. Plain array of samples
[ { "sample_id": ..., "task": "AR", ... }, ... ]

// 2. { samples: [...] } or { data: [...] }
{ "samples": [ ... ] }

// 3. Task-keyed object
{
  "AR":  [ { ... }, ... ],
  "TTL": [ ... ],
  "LRU": [ ... ],
  "CR":  [ ... ]
}
```

Each sample must include at least one of:

```jsonc
{
  "sample_id": "mab_0001",                      // optional, auto-generated otherwise
  "task": "AR",                                 // AR | TTL | LRU | CR (aliases accepted)
  "title": "Booksum chapter 3",                 // optional
  "context_turns": [                            // preferred — pre-paired dialogue
    { "role": "user",      "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "context_documents": [                        // OR list of long passages
    "Chapter 1 ...",
    "Chapter 2 ..."
  ],
  "qa": [
    {
      "qa_id": "ar_q1",                         // optional
      "question": "Who killed Caesar?",
      "answer": "Brutus and other senators",
      "evidence": ["doc#0:line 23"]              // optional
    }
  ],
  "metadata": { ... }
}
```

The loader normalizes common upstream variants:
- Task aliases — `Accurate Retrieval`, `accurate_retrieval`, `AR` all map to `AR`.
- Single-string `"context"` is treated as one long passage.
- QA keys `question | q | input`, `answer | gold_answer | target`, etc.

## Quick start

```sh
cd memory-evals
npm install

export KBN_URL=http://localhost:5601
export KBN_API_KEY=<encoded>
export KBN_AGENT_ID=default
export ANTHROPIC_API_KEY=sk-ant-...
export KBN_JUDGE=auto

# dry-run against the bundled smoke fixture (no external download required)
npm run memoryagentbench -- --dataset ../memoryagentbench/data/mab_sample.json --dry-run

# real dataset
npm run memoryagentbench -- --dataset ../../tmp/mab_full.json --samples 1 --dry-run

# 10-sample sanity check, AR + LRU only
npm run memoryagentbench -- --dataset ../../tmp/mab_full.json \
  --samples 10 --tasks AR,LRU \
  --session-size 8 \
  --run-id 2026-05-13-mab
```

## CLI

| Flag | Type | Default | Notes |
| --- | --- | --- | --- |
| `--dataset <path>` | string | required | MAB JSON file (any of the supported shapes). |
| `--samples N` | int | all | Take only the first N samples (after `--sample-ids`). |
| `--sample-ids id1,id2` | csv | all | Run only the listed sample_ids. |
| `--tasks AR,TTL,LRU,CR` | csv | all | Filter by normalized task code. |
| `--questions N` | int | all per sample | Cap questions per sample. |
| `--session-size N` | int | 0 (one conv per sample) | Chunk paired turns into sessions of N rounds. |
| `--max-sessions N` | int | all | Cap sessions imported per sample (debug). |
| `--run-id <name>` | string | `mab-<timestamp>` | Used for results dir + state.json id. |
| `--results-dir <path>` | string | `memoryagentbench/results` | Override output location. |
| `--no-teardown` | bool | false | Skip `_bulk_delete` at end of run. |
| `--no-memory-extract` | bool | false | Skip `triggerMemoryExtract`. |
| `--dry-run` | bool | false | Load + count, no HTTP calls. |
| `--help` | bool | false | Print usage. |

## Scoring

Uses LLM-as-judge (Anthropic / OpenAI / Noop) with per-task prompts:

- **AR** — strict fact match.
- **TTL** — did the model apply the previously-learned rule?
- **LRU** — multi-hop final answer match.
- **CR** — did the model pick the authoritative (latest) answer when sources
  conflict?

Output files mirror the LongMemEval shape:

```
results/<run-id>/
  state.json
  results.json     # category_scores keyed by AR / TTL / LRU / CR
  summary.md
  raw/<question_id>.json
```
