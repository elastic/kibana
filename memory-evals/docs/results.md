# Results

Every runner writes the same shape of output under
`<pkg>/results/<run-id>/`:

```
results/<run-id>/
  state.json     # live checkpoint, written after every question (resume here)
  results.json   # final aggregate + per-question records
  summary.md     # human-readable markdown
  raw/<question_id>.json   # per-question converse payload + scoring detail
```

`state.json` is the resume file — re-running with the same `--run-id` reads
it back and only asks new questions. `results.json` is the snapshot at end
of run.

## results.json

Shape (LongMemEval-compatible, extended for the other benchmarks):

```jsonc
{
  "timestamp": "2026-05-13T10:00:00.000Z",
  "benchmark": "LongMemEval | LoCoMo | MemoryAgentBench | Mem2Act | MemGround",
  "extraction_method": "external-memory-extract | no-extract",
  "feed_mode": "<runner-specific>",
  "total_questions": 50,
  "correct": 33,
  "partial": 6,
  "accuracy": 72.0,
  "category_scores": {
    "<category-key>": { "correct": 8, "partial": 1, "total": 10 }
  },
  "results": [ /* QuestionResult[] */ ]
}
```

`accuracy` is `(correct + 0.5 * partial) / scored * 100`, with `scored`
being `results.filter(r => r.score !== null).length`. Unscored questions
(e.g. when `KBN_JUDGE=none`) are NOT counted in the denominator.

`category_scores` is keyed by:

| Benchmark | Key |
| --- | --- |
| LongMemEval | `question_type` (e.g. `temporal`, `knowledge-update`) |
| LoCoMo | `cat_<n>` where n ∈ 1..5 |
| MemoryAgentBench | `AR | TTL | LRU | CR` |
| Mem2Act | sample `category` (free-form) |
| MemGround | probe `category` → scenario `category` → strategy |

## QuestionResult shape

One per asked question / probe / sample. The same shape across all five
benchmarks — extra fields are optional and benchmark-specific.

```jsonc
{
  "question_id": "<unique id>",                  // canonical id
  "question_type": "temporal",                   // LongMemEval only
  "sample_id": "locomo_sample_3",                // LoCoMo / MAB / Mem2Act / MemGround
  "category": "preference_drift",                // free-form per benchmark
  "question": "What's my current address?",
  "gold_answer": "99 New Ave",                   // or "tool(...)" repr for Mem2Act
  "predicted_answer": "Your current address is 99 New Ave.",

  "score": 1,                                    // 0 | 0.5 | 1 | null
  "judge_reason": "yes — captures gold",         // present when scored

  "sessions_fed": 1,                             // how many sessions were ingested
  "conversation_ids": ["<uuid>"],                // for cross-reference + cleanup
  "duration_ms": 1234,

  "error": "Conflict: tool not registered",      // present on failure

  "tool_calls": {                                 // Mem2Act + MemGround tool_call probes
    "gold":     [{ "tool_id": "add_event", "params": { ... } }],
    "observed": [{ "tool_id": "mem2act-xyz.add_event", "params": { ... } }],
    "precision": 1.0,
    "recall":    1.0,
    "f1":        1.0,
    "mode":      "permissive"
  }
}
```

## summary.md

Auto-generated, looks like:

```markdown
# LongMemEval — run summary

- timestamp: `2026-05-13T10:00:00.000Z`
- extraction_method: `no-extract`
- feed_mode: `per-question`
- total questions: **50**
- correct: **33**
- partial: **6**
- accuracy: **72.0%**

## Category scores

| Category | Correct | Partial | Total |
| --- | ---: | ---: | ---: |
| single-session-user | 12 | 1 | 14 |
| temporal | 6 | 3 | 10 |
| ... | ... | ... | ... |
```

## raw/<question_id>.json

Per-question dump. Used for debugging individual scores. Filename is
`question_id.replace(/[^A-Za-z0-9._-]/g, '_')`. Contents are
benchmark-specific:

- **LME / LoCoMo / MAB**: `{ qa, converse, result }`
- **Mem2Act**: `{ sample, converse, tool_score, result }`
- **MemGround**: `{ probe, converse, strategy, result }`

`converse` is the verbatim response from
`/api/agent_builder/converse`, including `steps[]`. For Mem2Act and
MemGround tool-call probes, `steps[]` is where the runner pulled tool calls
from (`type: "tool_call"`).

## Scoring semantics summary

| Strategy | Used by | Output | Meaning |
| --- | --- | --- | --- |
| LLM-as-judge | LME, LoCoMo, MAB, MemGround judge probes | 1 / 0.5 / 0 / null | yes / partial / no / not-scored |
| Exact match | MemGround `exact` probes | 1 / 0.5 / 0 | substring / all-tokens-present / miss |
| Tool-call | Mem2Act, MemGround `tool_call` probes | 1 / 0 | all gold calls matched AND no extras / else |

Per-tool F1 is always available on `tool_calls.f1` even when `score` is 0
— useful for partial credit when the binary score is too strict.

## Where the data persists

The eval results are local to the runner's `results/<run-id>/` directory —
the runner does NOT upload anywhere. Imported conversations live in the
Kibana conversations index until torn down (`_bulk_delete` runs at end of
each run unless `--no-teardown`). Memory rows live wherever the memory
team's pipeline stores them; the runner only triggers extraction, it
doesn't read memory state back.

## Re-running

Same `--run-id` resumes from `state.json`:

```sh
npm run longmemeval -- --dataset ... --run-id baseline-2026-05-13
# crashes after question 23
npm run longmemeval -- --dataset ... --run-id baseline-2026-05-13
# resumes from question 24, reports questions 1-23 as `cached`
```

Different `--run-id` starts fresh in a new directory. The deterministic
conversation IDs guarantee that re-running the same questions overwrites
the same conversations (mode `overwrite` on `_import`) — no orphan
conversations from crashed runs.

## Cleaning up

Three places hold data after a run:

1. **Local results** (`<pkg>/results/<run-id>/`) — `rm -rf` to clean. Safe
   to keep around for analysis.
2. **Kibana conversations** — `_bulk_delete` runs automatically at end of
   each run. To clean orphans manually, target the run window:
   ```sh
   curl -X POST "$KBN_URL/internal/agent_builder/conversations/_bulk_delete" \
     -H "Authorization: ApiKey $KBN_API_KEY" \
     -H "kbn-xsrf: report-it" -H "Content-Type: application/json" \
     -d '{"agent_id":"default","created_after":"2026-05-13T00:00:00Z"}'
   ```
3. **Kibana MCP tools** (Mem2Act `--register-tools` only) — `_bulk_delete`
   on tools runs automatically unless `--no-teardown-tools`. To clean
   orphans, list `GET /api/agent_builder/tools`, filter by namespace
   `mem2act-<run-id>` or tag `mem2act-run:<run-id>`, and bulk-delete.

Memory rows are *not* cleaned by the runner — that's reserved for the
memory team's own bulk-delete API.
