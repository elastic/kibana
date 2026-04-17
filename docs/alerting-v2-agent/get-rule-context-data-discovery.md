# `get_rule_context` — Data Discovery Design

> Working design document for the data discovery phase of the `get_rule_context` tool.
> Covers how the tool resolves a user's natural language intent to a concrete index,
> understands the data in that index, and assembles the context needed for `draft_rule`.

---

## Tool split: `resolve_rule_source_index` + `get_rule_context`

Index resolution and context gathering are two distinct responsibilities with different
inputs, outputs, and failure modes. They are implemented as separate tools:

| Tool | Required input | Output | Purpose |
|------|---------------|--------|---------|
| `resolve_rule_source_index` | `intent` (natural language, optional) | `candidates[]` | Resolve user intent to a confirmed source index |
| `get_rule_context` | `index` (required, confirmed) | full rule context | Gather field caps, schema, and rule inventory for a known index |

The agent always calls `resolve_rule_source_index` first unless the user has provided an
explicit index name. `get_rule_context` requires a confirmed index and always returns context
— its return shape is stable and independently testable.

---

## Step 1: `resolve_rule_source_index`

### The problem

The user's intent ("my checkout service metrics") is a natural language phrase. Before any
field caps or sampling can happen, the tool must resolve that phrase to one or more concrete
index targets (a Streams stream, a data view, or a raw index pattern).

### Candidate sources

Query these in parallel:

| Source | How to query | What it returns |
|--------|-------------|-----------------|
| Streams streams | `streamsClient.listStreams()` | Stream names + definitions; Streams streams also carry pre-computed feature KIs (entity, technology, schema type) that are strong matching signals |
| Data views | Kibana data views API (user-scoped) | Data view titles and index patterns |

Both queries must use **user-scoped clients** — the candidate list itself is RBAC-gated.

### Matching intent to candidates

Pass the candidate list to the LLM alongside the user's phrase. For Streams candidates,
include any stored feature labels (entity names, technology tags) as additional matching
context — e.g. a stream with a stored entity feature `checkout` is a stronger match for
"checkout service" than one whose name alone partially matches.

### Handling ambiguity

| Scenario | Behavior |
|----------|----------|
| Exactly one strong match | Return it; inform the user which index was selected and ask them to confirm before calling `get_rule_context` |
| Multiple plausible matches | **Stop and ask the user** — present the candidates and let them choose |
| No match found | **Stop and ask the user** — ask them to clarify or provide the index name directly |

> Ambiguity must be resolved by the user, not by the tool. Silently picking the wrong index
> would cause everything downstream (field caps, draft, rule) to be built against the wrong data.
