# MemGround

MemGround tests **grounding under dynamics** — preferences change, facts get
retracted, sessions are separated in time. Unlike LME / LoCoMo / MAB (each
of which has a fixed dataset shape), MemGround is *scenario-driven*: each
scenario is an ordered list of events (user turns, assistant turns, optional
session breaks, and probes) describing a story over time.

The state machine that threads this all together lives entirely in the
runner — Kibana stays generic.

## 1. Get the dataset

```sh
# Bundled smoke fixture covers 3 scenarios (preference drift, contradiction, tool grounding)
ls memground/data/scenarios_sample.json

# Real scenarios go in ../tmp/memground_*.json — see §4 for the shape.
```

## 2. Prerequisites

Standard [setup.md](setup.md). Notes specific to MemGround:

- LLM-as-judge recommended for `scoring: judge` probes
  (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY`).
- For `scoring: tool_call` probes — the agent must have the referenced
  tools available. The MemGround runner does NOT call `_bulk_create_mcp`
  itself; if you need to register tools, do it ahead of time via Mem2Act
  (`npm run mem2act -- --register-tools --dataset <list-of-tools.json> --no-teardown`)
  or via the Agent Builder UI.
- `scoring: exact` probes are deterministic and need no judge.

## 3. Dry-run first

```sh
npm run memground -- \
  --dataset ../memground/data/scenarios_sample.json \
  --dry-run
```

Expected:

```
MemGround runner — run_id=memground-<timestamp> default_scoring=judge
Loaded 3 scenario(s).
Selected 3 scenario(s) after filters.
DRY RUN — would ingest 5 session(s) (6 round(s)) across 3 scenario(s), then ask 6 probe(s). No Kibana calls made.
```

## 4. Scenario file shape

The loader is the most flexible of the suite:

```jsonc
// 1. Plain array
[ { "scenario_id": ..., "events": [ ... ] } ]

// 2. { scenarios: [...] }, { samples: [...] }, { data: [...] }
{ "scenarios": [ ... ] }

// 3. Single scenario at root if it has `events`
{
  "scenario_id": "mg_diet_001",
  "title": "Diet preference drift",
  "category": "preference_drift",
  "default_scoring": "judge",
  "events": [
    { "type": "user_message", "content": "I'm vegan." },
    { "type": "assistant_message", "content": "Got it." },
    { "type": "probe", "question": "Am I vegan?", "answer": "yes", "scoring": "exact" },
    { "type": "session_break", "next_session_title": "Three weeks later" },
    { "type": "user", "content": "Actually I switched to fish." },
    { "type": "ai", "content": "Updated — pescatarian." },
    { "type": "probe", "question": "Am I still vegan?", "answer": "no", "scoring": "judge" }
  ]
}
```

### Event types and aliases

| Canonical | Aliases | Notes |
| --- | --- | --- |
| `user_message` | `user`, `user_turn`, `human` | `content`, `text`, or `message`. |
| `assistant_message` | `assistant`, `assistant_turn`, `agent`, `ai` | Same. |
| `session_break` | `break`, `new_session`, `next_session` | Optional `next_session_title`. |
| `probe` | `qa`, `question`, `question_answer` | See below. |

Short-form rounds are supported (treated as a user followed by assistant):

```jsonc
{ "user": "morning", "assistant": "hey" }
{ "q": "What did I say?", "a": "morning" }
```

### Probe scoring

Each probe declares its own strategy. The runner-wide `--default-scoring`
flag is the fallback if neither `probe.scoring` nor
`scenario.default_scoring` is set.

| `scoring` | What's required | How it scores |
| --- | --- | --- |
| `judge` (default) | `answer` | LLM-as-judge with the MemGround prompt. yes / partial / no → 1 / 0.5 / 0. |
| `exact` | `answer` | Substring match by default. Set `"exact_regex": true` or wrap `answer` in `/regex/` for regex. 1 on full match, 0.5 if all gold tokens appear (non-contiguous), else 0. |
| `tool_call` | `gold_calls[]` (+ optional `score_mode`) | Reuses the Mem2Act tool-call scorer. |

Scoring aliases accepted: `contains` / `substring` → `exact`; `llm` →
`judge`; `tool` / `action` → `tool_call`.

## 5. Small live run (smoke)

```sh
npm run memground -- \
  --dataset ../memground/data/scenarios_sample.json \
  --run-id smoke-$(date +%s) \
  --no-teardown
```

To focus on one strategy:

```sh
# only the tool-grounding scenario
npm run memground -- \
  --dataset ../memground/data/scenarios_sample.json \
  --scenario-ids mg_tool_001 \
  --run-id smoke
```

## 6. Full run

```sh
npm run memground -- \
  --dataset ../../tmp/memground_full.json \
  --run-id baseline-2026-05-13
```

## 7. Flag reference

| Flag | Effect |
| --- | --- |
| `--samples N` | First N scenarios (after `--scenario-ids`). |
| `--scenario-ids id1,id2` | Run only listed scenario ids. |
| `--categories cat1,cat2` | Filter by scenario `category`. |
| `--probes N` | Global cap on probes asked across the entire run. |
| `--default-scoring <m>` | Fallback strategy: `judge | exact | tool_call`. Default `judge`. |
| `--persist-probes` | Persist probe rounds on the conversation. Default sends them with `persist: false`. |
| `--run-id <name>` | Resume / namespace. |
| `--no-teardown` | Skip `_bulk_delete` after the run. |
| `--no-memory-extract` | Skip memory-extract POST. |
| `--results-dir <path>` | Override output location. |
| `--dry-run` | Plan only. |

Full reference: `memground/README.md`.

## 8. What the runner does per scenario

1. **Plan** (offline, no HTTP) — walk events:
   - Pair `user_message` + `assistant_message` into rounds.
   - Consecutive `user_message`s get a synthetic `(no assistant reply
     recorded)` filler.
   - Orphan `assistant_message`s get a synthetic `(no prior user turn)`
     filler.
   - `session_break` opens a new conversation (deterministic id
     `sha256(run_id + scenario_id + session_idx)`).
   - Each `probe` is attached to the *current* session at its current
     round position.
   - Empty leading / trailing sessions are pruned and sessions are
     re-indexed.
2. **Import** — each session's full rounds in one shot (`mode: overwrite`).
3. **Memory extract** per session (optional).
4. **Ask** — each probe via `converse`, attached to the session that
   contains it. Default `persist: false` so probes don't bleed into the
   next probe's view.
5. **Score** — pick the strategy:
   - `exact` → `scoreExactMatch` (deterministic).
   - `tool_call` → `scoreMem2Act` on parsed tool calls.
   - `judge` → LLM-as-judge with the MemGround prompt.
6. **Checkpoint** + raw dump.
7. **Teardown** — `_bulk_delete` conversations by agent + `created_after`.

## 9. Reading results

`category_scores` is keyed by **probe category** (probe.category →
scenario.category → strategy). Useful slices for typical scenarios:

```jsonc
{
  "category_scores": {
    "preference_drift": { "correct": 4, "partial": 1, "total": 6, "accuracy": 66.7 },
    "contradiction":    { "correct": 8, "partial": 0, "total": 8, "accuracy": 100.0 },
    "tool_grounding":   { "correct": 2, "partial": 0, "total": 3, "accuracy": 66.7 }
  }
}
```

Each `QuestionResult` carries `sample_id = scenario_id` and a per-probe
strategy in the `raw/<id>.json` dump.

See [results.md](results.md) for the full schema.

## 10. Authoring scenarios

A few patterns from the bundled fixture:

**Preference drift across sessions**:

```jsonc
{
  "scenario_id": "mg_diet_001", "category": "preference_drift",
  "events": [
    { "type": "user_message", "content": "I'm vegan." },
    { "type": "assistant_message", "content": "Got it." },
    { "type": "probe", "question": "Am I vegan?", "answer": "yes", "scoring": "exact" },
    { "type": "session_break" },
    { "user": "Started eating fish again.", "assistant": "Updated." },
    { "type": "probe", "question": "Am I still strict vegan?", "answer": "no", "scoring": "exact" }
  ]
}
```

**Contradiction within a single session**:

```jsonc
{
  "scenario_id": "mg_address_001", "category": "contradiction",
  "events": [
    { "user": "My address is 123 Old Street.", "assistant": "Saved." },
    { "user": "Actually I moved — new address is 99 New Ave.", "assistant": "Updated." },
    { "type": "probe", "question": "What is my current address?", "answer": "99 New Ave", "scoring": "exact" }
  ]
}
```

**Tool-call grounding**:

```jsonc
{
  "scenario_id": "mg_tool_001", "category": "tool_grounding",
  "events": [
    { "type": "user_message", "content": "Sarah's birthday is May 4." },
    { "type": "assistant_message", "content": "Noted." },
    {
      "type": "probe",
      "question": "Schedule a reminder for Sarah's birthday this year (2026).",
      "scoring": "tool_call",
      "score_mode": "permissive",
      "gold_calls": [
        { "tool_id": "add_event", "params": { "title": "Sarah's birthday", "date": "2026-05-04" } }
      ]
    }
  ]
}
```

## 11. Common pitfalls

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `scenario must include at least one probe` | Loader rejection on a scenario without probes | Add a probe or remove the scenario. |
| `unknown type "..."` | Event type not in alias map | Use `user_message` / `assistant_message` / `session_break` / `probe` or one of the aliases. |
| `tool_call probe requires gold_calls` | Probe set `scoring: tool_call` but omitted `gold_calls[]` | Add gold calls or pick a different strategy. |
| `--probes 2` runs more than 2 | Pre-2026-05-13 issue, fixed | `--probes` is now a **global** cap; re-pull. |
| Tool-call probe always scores 0 | Agent doesn't have the gold tool registered | Pre-register via Mem2Act or the Agent Builder UI. |
| All judge scores `partial` | Judge prompt sees stale gold | Make sure `answer` reflects the *latest* state in the scenario, not the original. |

More in [troubleshooting.md](troubleshooting.md).
