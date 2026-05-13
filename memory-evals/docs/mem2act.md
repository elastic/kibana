# Mem2ActBench

Mem2ActBench-style benchmarks test **action grounding**: given a dialogue
that establishes a persistent state, can the agent pick the *right tool
calls* to satisfy the next user request?

This runner is the only one in the suite that does NOT use an LLM-as-judge.
It scores by deterministic comparison between the agent's invoked tool
calls (parsed from `steps[].tool_call`) and the gold list.

## 1. Get the dataset

```sh
# Option A: bundled smoke fixture (3 hand-crafted samples with calendar / contact / reminder tools)
ls mem2act/data/mem2act_sample.json

# Option B: place a full dataset at ../tmp/mem2act_full.json
```

Use the smoke fixture as a structural reference.

## 2. Prerequisites

Two configurations exist. Pick one before running:

### Mode A — Agent already has the tools

If your `KBN_AGENT_ID` already has the benchmark's tools allowlisted, just
run the eval. The runner scores whichever tool calls the agent emits.

This is the simplest setup but requires manual tool curation per benchmark.

### Mode B — Auto-register tools via MCP (`--register-tools`)

Recommended for repeatable runs. Requires:

1. **An MCP Stack connector configured in Kibana**, pointed at an external
   MCP server that exposes the benchmark's tools with no-op handlers
   (Plan 025 §6).
2. The connector id in `KBN_MCP_CONNECTOR_ID`.
3. `agentBuilder:write` privilege on the API key.

The runner will:

- POST `/internal/agent_builder/tools/_bulk_create_mcp` with
  `namespace: mem2act-<run-id>` and `tags: ['mem2act-eval', 'mem2act-run:<run-id>']`.
- After the run, walk `GET /api/agent_builder/tools` and bulk-delete
  every tool with the namespace prefix or the matching run tag.

Example one-off MCP no-op server in Python is out of scope here — any
MCP-compliant noop server works.

```sh
export KBN_URL=http://localhost:5601
export KBN_API_KEY=<encoded>
export KBN_AGENT_ID=default
export KBN_MCP_CONNECTOR_ID=<mcp-stack-connector-id>
```

## 3. Dry-run first

```sh
npm run mem2act -- \
  --dataset ../mem2act/data/mem2act_sample.json \
  --dry-run
```

Expected:

```
Mem2Act runner — run_id=mem2act-<timestamp> score_mode=permissive
Loaded 3 sample(s).
Selected 3 sample(s) after filters.
DRY RUN — would ingest 3 sample(s), register 3 unique tool(s), and score 3 gold call(s) across 3 question(s). No Kibana calls made.
```

Dry-run reports the unique tool count even though no registration happens
yet — useful for sizing the MCP server.

## 4. Dataset shape

```jsonc
// Plain array OR { samples: [...] } OR { samples: [...], tool_schemas: [...] }
[
  {
    "sample_id": "m2a_cal_0001",                        // optional
    "category": "calendar",                             // optional split tag
    "dialogue": [
      { "role": "user",      "content": "Sarah's birthday is May 4." },
      { "role": "assistant", "content": "Got it." }
    ],
    "query": "Schedule a reminder for Sarah's birthday next month.",
    "tool_schemas": [                                   // optional inline; can be at file root
      {
        "name": "add_event",
        "description": "Schedule a calendar event.",
        "parameters": { "type": "object", "properties": { ... } }
      }
    ],
    "gold_calls": [
      { "tool_id": "add_event", "params": { "title": "Sarah's birthday", "date": "2026-05-04" } }
    ]
  }
]
```

The loader is permissive — accepts these field aliases:

| Spec field | Aliases the loader accepts |
| --- | --- |
| `dialogue` | `history`, `context` |
| `query` | `question`, `input`, `user` |
| `gold_calls` | `gold`, `expected_tool_calls`, `tool_calls` |
| `gold_calls[].tool_id` | `tool`, `name` |
| `gold_calls[].params` | `arguments`, `input` |
| `tool_schemas` | `tools` |
| `tool_schemas[].parameters` | `params`, `input_schema`, `schema` |

## 5. Small live run (smoke)

Without MCP registration (Mode A):

```sh
npm run mem2act -- \
  --dataset ../mem2act/data/mem2act_sample.json \
  --run-id smoke-$(date +%s) \
  --no-teardown
```

With MCP registration (Mode B):

```sh
npm run mem2act -- \
  --dataset ../mem2act/data/mem2act_sample.json \
  --register-tools \
  --run-id smoke-$(date +%s) \
  --no-teardown \
  --no-teardown-tools     # keep tools so you can inspect them in the UI
```

## 6. Full run

```sh
npm run mem2act -- \
  --dataset ../../tmp/mem2act_full.json \
  --register-tools \
  --score-mode permissive \
  --run-id baseline-2026-05-13
```

## 7. Flag reference

| Flag | Effect |
| --- | --- |
| `--samples N` | First N samples (after `--sample-ids`). |
| `--sample-ids id1,id2` | Run only listed sample ids. |
| `--categories cat1,cat2` | Filter by sample `category`. |
| `--score-mode <m>` | `strict | unordered | permissive` (default permissive). |
| `--register-tools` | Register tool schemas via `_bulk_create_mcp`. Needs `KBN_MCP_CONNECTOR_ID`. |
| `--no-teardown-tools` | Keep registered tools after run (debug). |
| `--run-id <name>` | Resume / namespace. |
| `--no-teardown` | Skip conversation `_bulk_delete`. |
| `--no-memory-extract` | Skip memory-extract POST. |
| `--results-dir <path>` | Override output location. |
| `--dry-run` | Plan only. |

Full reference: `mem2act/README.md`.

## 8. Score modes

| Mode | Order matters? | Param check | Use when |
| --- | --- | --- | --- |
| `strict` | yes | deep-equal | The benchmark specifies exact arg shapes. |
| `unordered` | no | deep-equal | Parallel tool calls (order LLM-chosen). |
| `permissive` (default) | yes | gold keys only — extras ignored | Real LLMs that add ancillary fields. |

In every mode the runner reports `precision`, `recall`, `f1`, and a list of
`extra_calls`. The headline `score` is 1 only when:

- all gold calls are matched per the chosen mode, AND
- no extra calls were made beyond gold

…else 0. The fine-grained F1 lives in `tool_calls.f1` on each result.

Namespace handling: the runner accepts `mem2act-<run>.add_event` as
matching gold `add_event` (configurable). This is how MCP tool registration
typically prefixes ids.

## 9. What the runner does per sample

1. (Once at start, if `--register-tools`) call `_bulk_create_mcp` with the
   deduplicated tool schemas across all selected samples.
2. **Import** the sample's dialogue as one conversation (deterministic
   id from `sha256(run_id + sample_id + 'dialogue')`).
3. **Memory extract** (optional).
4. **Ask** — `converse` (with `conversation_id` so the agent has the
   dialogue + memory) for the sample's `query`. **No** `persist: false`
   here — the round IS persisted so its tool-call steps stick around for
   later inspection.
5. **Parse** `steps[]` for `type: "tool_call"` entries → `observed`.
6. **Score** `observed` vs `gold_calls` per the selected mode.
7. **Checkpoint** + raw dump (`raw/<sample_id>.json` includes the full
   converse response + score breakdown).
8. **Teardown** — `_bulk_delete` conversations by agent + `created_after`.
   If `--register-tools` was used, also bulk-delete tools by namespace /
   tag.

## 10. Reading results

```jsonc
{
  "summary": {
    "correct": 17, "total_questions": 25,
    "accuracy": 68.0,
    "category_scores": {
      "calendar": { "correct": 8,  "total": 10, "accuracy": 80.0 },
      "contact":  { "correct": 5,  "total": 7,  "accuracy": 71.4 },
      "reminder": { "correct": 4,  "total": 8,  "accuracy": 50.0 }
    }
  }
}
```

For F1 / precision / recall, look at individual `QuestionResult.tool_calls`
in `results.json` or `raw/<sample_id>.json`:

```jsonc
{
  "tool_calls": {
    "gold":     [{ "tool_id": "add_event", "params": { ... } }],
    "observed": [{ "tool_id": "mem2act-xyz.add_event", "params": { ... } }],
    "precision": 1.0,
    "recall":    1.0,
    "f1":        1.0,
    "mode":      "permissive"
  }
}
```

See [results.md](results.md) for the full schema.

## 11. Common pitfalls

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `--register-tools requires KBN_MCP_CONNECTOR_ID` | env var missing | Export the MCP Stack connector id from Kibana. |
| All scores 0 even though agent calls the right tool | Trailing-name match is off, or namespace prefix mismatch | The runner uses `matchTrailingName: true` by default; check `raw/<id>.json:tool_calls` to compare names. |
| `409 Conflict` on `_bulk_create_mcp` | Namespace collision from a previous run | Use a unique `--run-id`. The namespace is `mem2act-<run-id>`. |
| Score is 0 but precision/recall = 1.0 | The agent made *extra* unmatched calls | Either tune the agent prompt, or accept the F1 view instead of the binary score. |
| `5xx` from `triggerMemoryExtract` | `KBN_MEMORY_EXTRACT_URL` endpoint unreachable | Unset the var or pass `--no-memory-extract`. |
| Tools persist after the run | `--no-teardown-tools` left on, or teardown listing failed | Manually clear via `GET /api/agent_builder/tools` + `POST /internal/agent_builder/tools/_bulk_delete`. |

More in [troubleshooting.md](troubleshooting.md).
