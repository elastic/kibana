# @memory-evals/memground

External runner for **MemGround**-style scenario benchmarks. A scenario is an
ordered list of events (user/assistant turns, optional session breaks, and
**probes**) describing a story over time. The runner replays the events into
Kibana via the import API, triggers memory extraction at each session
boundary, and asks each probe through `/converse` (by default with
`persist: false` so the probe round doesn't pollute the conversation that the
agent is being scored against).

## Why scenario-driven?

MemGround tests *grounding* under realistic dynamics — preferences change,
facts get retracted, sessions are separated in time. The state machine that
threads this all together is intentionally **outside Kibana** (Kibana stays
generic). The runner owns:

- when to start a new conversation (`session_break`)
- when to ask each probe (`probe`)
- how to score each probe (`judge | exact | tool_call`)

## Scenario file

The loader is permissive — common synonyms for event types and probe fields
are normalised, and you can use either a single-scenario object or a list.

```jsonc
// 1. Plain array
[
  { "scenario_id": "mg_diet_001", "events": [ ... ] },
  { "scenario_id": "mg_address_001", "events": [ ... ] }
]

// 2. { scenarios: [...] }
{ "scenarios": [ ... ] }

// 3. Single scenario at root (if it has `events`)
{
  "scenario_id": "mg_solo",
  "title": "Diet tracker",
  "category": "preference_drift",
  "default_scoring": "judge",
  "events": [
    { "type": "user_message", "content": "I'm vegan." },
    { "type": "assistant_message", "content": "Got it." },
    { "type": "probe", "question": "Am I vegan?", "answer": "yes", "scoring": "exact" },
    { "type": "session_break", "next_session_title": "Three weeks later" },
    { "type": "user", "content": "Actually I started eating fish again." },
    { "type": "assistant", "content": "Updated." },
    { "type": "probe", "question": "Am I still strict vegan?", "answer": "no", "scoring": "judge" }
  ]
}
```

### Event types & aliases

| Canonical | Aliases | Notes |
| --- | --- | --- |
| `user_message` | `user`, `user_turn`, `human` | `content`, `text`, or `message`. |
| `assistant_message` | `assistant`, `assistant_turn`, `agent`, `ai` | Same as above. |
| `session_break` | `break`, `new_session`, `next_session` | Optional `next_session_title`. |
| `probe` | `qa`, `question`, `question_answer` | See below. |

Short-form rounds are also accepted (treated as a `user_message` followed
later by `assistant_message`):

```jsonc
{ "user": "I switched to oat milk", "assistant": "Noted." }
{ "q": "What milk do I use?", "a": "oat" }
```

### Probe scoring

Each probe declares its scoring strategy. The runner-wide
`--default-scoring` flag is the fallback when neither `probe.scoring` nor
`scenario.default_scoring` is set.

| `scoring` | What's required | Behaviour |
| --- | --- | --- |
| `judge` (default) | `answer` | LLM-as-judge using the MemGround grounding prompt. yes/partial/no → 1 / 0.5 / 0. |
| `exact` | `answer` | Case-insensitive substring match. Returns 1 on full match, 0.5 if every gold token appears (non-contiguous), 0 otherwise. Set `"exact_regex": true` or wrap gold in `/.../` to interpret as regex. |
| `tool_call` | `gold_calls[]` | Mem2Act-style tool-call scoring on `steps[]`. Pass `score_mode: strict | unordered | permissive` per-probe (default permissive). |

## Quick start

```sh
cd memory-evals
npm install

export KBN_URL=http://localhost:5601
export KBN_API_KEY=<encoded>
export KBN_AGENT_ID=default
export ANTHROPIC_API_KEY=sk-ant-...
export KBN_JUDGE=auto

# Dry-run against the bundled smoke fixture
npm run memground -- --dataset ../memground/data/scenarios_sample.json --dry-run

# Full run with all default settings
npm run memground -- --dataset ../memground/data/scenarios_sample.json \
  --run-id 2026-05-13-memground
```

## CLI

| Flag | Type | Default | Notes |
| --- | --- | --- | --- |
| `--dataset <path>` | string | required | MemGround scenario file. |
| `--samples N` | int | all | Cap to first N scenarios (after id filter). |
| `--scenario-ids id1,id2` | csv | all | Run only listed scenario_ids. |
| `--categories cat1,cat2` | csv | all | Filter by `category`. |
| `--probes N` | int | all | Cap probes per run (post-flattening). |
| `--default-scoring <m>` | enum | `judge` | Fallback strategy: `judge | exact | tool_call`. |
| `--persist-probes` | bool | false | Persist probe rounds on the conversation. Default sends them with `persist: false`. |
| `--run-id <name>` | string | `memground-<timestamp>` | Used for results dir + state.json id. |
| `--results-dir <path>` | string | `memground/results` | Override output location. |
| `--no-teardown` | bool | false | Skip `_bulk_delete` at end. |
| `--no-memory-extract` | bool | false | Skip `triggerMemoryExtract`. |
| `--dry-run` | bool | false | Plan and count, no HTTP calls. |
| `--help` | bool | false | Print usage. |

## State machine

The runner pre-plans each scenario before any HTTP calls:

1. Walk events in order, pair `user_message` + `assistant_message` into
   `ImportRound`s. Unbalanced pairs (e.g. two consecutive `user_message`s)
   get a synthetic `(no assistant reply recorded)` filler.
2. `session_break` closes the current session and opens a new one with a
   fresh deterministic conversation_id (`sha256(run_id + scenario_id +
   session_idx)`).
3. `probe` events attach to the *current* session at their current round
   position.

At runtime, for each scenario:

1. Import each session's full rounds in one shot (`mode: overwrite`).
2. Trigger memory extract for each session.
3. Ask each probe via `/converse`, attached to the session that contains it,
   with `persist: false` by default (so grounding is tested without the probe
   appearing in the dialogue the next probe would see).
4. Score each probe with its declared strategy.

## Outputs

```
results/<run-id>/
  state.json
  results.json
  summary.md
  raw/<probe_id>.json   # converse payload, probe spec, strategy, score
```

The persistent JSON has `benchmark: "MemGround"` and `category_scores` keyed
by the probe / scenario category — useful for slicing
`preference_drift` vs `contradiction` vs `temporal` accuracy.
