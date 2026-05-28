# @memory-evals/mem2act

External runner for Mem2ActBench-style benchmarks (action/tool selection given
persistent memory). Imports each sample's dialogue as a conversation, triggers
memory extraction, asks the final query through `/converse` (with the
conversation_id so the agent has full context + memories), then parses
`steps[]` for `tool_call` entries and scores them against the gold list.

## Dataset shape

```jsonc
// Plain array OR { samples: [...] } OR { samples: [...], tool_schemas: [...] }
[
  {
    "sample_id": "m2a_0001",                       // optional, auto-generated otherwise
    "category": "calendar",                        // optional split / task tag
    "dialogue": [
      { "role": "user",      "content": "Add Sarah's birthday on May 4 every year." },
      { "role": "assistant", "content": "Got it, I'll remember Sarah's birthday is May 4." }
    ],
    "query": "Schedule a reminder for Sarah's birthday next month.",
    "tool_schemas": [                               // optional inline; can be at file root
      {
        "name": "add_event",
        "description": "Schedules a calendar event.",
        "parameters": { "type": "object", "properties": { ... } }
      },
      { "name": "lookup_contact" }
    ],
    "gold_calls": [
      { "tool_id": "add_event", "params": { "title": "Sarah's birthday", "date": "2025-05-04" } }
    ]
  }
]
```

The loader is permissive — `gold_calls` is also accepted as `gold`,
`expected_tool_calls`, or `tool_calls`; tool params can be under `params`,
`arguments`, or `input`; etc.

## Quick start

```sh
cd memory-evals
npm install

export KBN_URL=http://localhost:5601
export KBN_API_KEY=<encoded>
export KBN_AGENT_ID=default
# Required only when --register-tools is passed:
export KBN_MCP_CONNECTOR_ID=<connector-id-of-your-mem2act-mcp-server>

# dry-run against the bundled smoke fixture
npm run mem2act -- --dataset ../mem2act/data/mem2act_sample.json --dry-run

# Full run, registering tool stubs in a per-run namespace
npm run mem2act -- --dataset ../../tmp/mem2act_full.json \
  --register-tools \
  --score-mode permissive \
  --run-id 2026-05-13-mem2act
```

## CLI

| Flag | Type | Default | Notes |
| --- | --- | --- | --- |
| `--dataset <path>` | string | required | Mem2Act JSON file. |
| `--samples N` | int | all | Take only the first N samples (after id filter). |
| `--sample-ids id1,id2` | csv | all | Run only the listed sample_ids. |
| `--categories cat1,cat2` | csv | all | Filter by `category` field. |
| `--score-mode <m>` | enum | `permissive` | One of `strict | unordered | permissive`. |
| `--register-tools` | bool | false | Register tool schemas via `_bulk_create_mcp` (needs `KBN_MCP_CONNECTOR_ID`). |
| `--no-teardown-tools` | bool | false | Keep registered tools after run (debug). |
| `--run-id <name>` | string | `mem2act-<timestamp>` | Used for results dir + state + tool namespace. |
| `--results-dir <path>` | string | `mem2act/results` | Override output location. |
| `--no-teardown` | bool | false | Skip conversation `_bulk_delete`. |
| `--no-memory-extract` | bool | false | Skip `triggerMemoryExtract`. |
| `--dry-run` | bool | false | Load + count, no HTTP calls. |
| `--help` | bool | false | Print usage. |

## Score modes

- **strict** — tool ids match the gold list in order, and params deep-equal.
- **unordered** — same multiset of (tool_id, params) but order doesn't matter.
- **permissive** (default) — tool ids in order, but params are only checked for
  the keys present in the gold call. Extra keys on the observed call are
  tolerated. This is the most forgiving for real LLMs that sometimes add
  ancillary fields.

In every mode the runner also reports `precision`, `recall`, `f1`, and a list
of `extra_calls` the agent made beyond gold. The headline `score` is 1 only
when **all** gold calls match exactly per the chosen mode AND there are no
extra calls; otherwise 0.

## Tool registration model

The plan in `plans/025_agent_builder_eval_harness_integration.md` calls for an
**external** MCP server that exposes the benchmark's tool names with no-op
handlers. The runner does not embed that server — instead, it expects:

1. An MCP Stack connector configured in Kibana that points at your no-op
   server (`KBN_MCP_CONNECTOR_ID`).
2. `--register-tools` to call `/internal/agent_builder/tools/_bulk_create_mcp`
   with `namespace=mem2act-<run-id>` and tag `mem2act-run:<run-id>`.
3. On teardown (`--no-teardown-tools` to skip), the runner walks
   `GET /api/agent_builder/tools`, finds entries with the namespace prefix or
   matching tag, and bulk-deletes them.

If you don't pass `--register-tools`, the runner skips MCP entirely and just
scores whatever tool calls the existing agent makes — useful when you have
tools pre-configured on the agent or you only care about predict-only stats.

## Outputs

```
results/<run-id>/
  state.json
  results.json
  summary.md
  raw/<sample_id>.json     # converse payload + tool_score detail
```

Each `QuestionResult` carries:
- `score` — 0 or 1 (exact match per chosen mode)
- `tool_calls.precision / recall / f1`
- `tool_calls.gold` — the gold call list
- `tool_calls.observed` — what the agent actually invoked
