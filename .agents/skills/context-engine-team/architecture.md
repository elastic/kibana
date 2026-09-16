# Context Engine — Architecture

Reference architecture for the **Context Engine**, part of Elastic's Agent Builder. This document
covers the merged AI-index platform and the **not-yet-merged** self-improvement feedback loop.

- **Plugin:** `x-pack/platform/plugins/shared/context_engine/` · plugin id `contextEngine` ·
  package `@kbn/context-engine-plugin` · owner `@elastic/context-eng`.
- **Tracking:** workstream [search-team#15386](https://github.com/elastic/search-team/issues/15386),
  delivery epic [#15572](https://github.com/elastic/search-team/issues/15572),
  traces workstream [#14067](https://github.com/elastic/search-team/issues/14067).
- **Feedback-loop source of truth:** draft PR [elastic/kibana#282241](https://github.com/elastic/kibana/pull/282241).
- Sibling docs: exact schemas & signatures in [`interfaces.md`](./interfaces.md); coding rules in
  [`conventions.md`](./conventions.md).

> **Status legend used throughout:** **[MERGED]** = in `main` today · **[PoC]** = specified in PR #282241,
> not yet merged.

---

## 1. System overview

The core object is an **`ai_index`**: a curated store of **Knowledge Items (KIs)** that agents query for
good context. Everything else exists to fill it, query it, or improve it.

| Component | Status | What it is |
| --- | --- | --- |
| **ai_index** | [MERGED] | A logical name over a backing store (`dest`: an `ai-index-*` index or data stream) holding KIs. Metadata lives in the hidden `.contextengine-ai-indices` system index. |
| **Knowledge Items (KIs)** | [MERGED] | Curated documents (`type/title/content/description/tags/attributes`, with a `content.semantic` sub-field) that agents retrieve. |
| **sources** | [MERGED] | Raw upstream data an ai_index draws knowledge from — `esql` queries or action-`connector` instances. |
| **automations** | [MERGED] | Kibana **Workflows** that read a source and write KIs into the backing store. Stored as `{ type: 'workflow', value }`. |
| **setup skill** | [PoC] | Agent Builder skill (`context-engine-setup`) that bootstraps KIs from sources (0 → working index). |
| **retrieval skill** | [PoC] | How agents query the index at runtime — ES\|QL **FORK + FUSE** hybrid with `METADATA _id, _index, _score`. |
| **traces** | external | Agents emit OTel traces to `traces-agent_builder.otel-*` when they use the index. |
| **feedback loop** | [PoC] | Turns traces into fixable problems via **cases → patterns → improvements**. |

### End-to-end data flow

```
                         ┌──────────── SETUP / POPULATE ────────────┐
  sources ──────────────►│  setup skill + KI-creation automations   │────► KIs in ai_index backing store
  (esql / connector)     │  (Kibana Workflows)                      │      (ai-index-idx-* / ai-index-ds-*)
                         └──────────────────────────────────────────┘                 │
                                                                                       │ retrieval skill
                                                                                       │ (ES|QL FORK+FUSE)
                                                                                       ▼
                                                                              ┌──────────────────┐
                                                                              │   Agents (user)  │
                                                                              └────────┬─────────┘
                                                                                       │ emit OTel traces
                                                                                       ▼
                                                            traces-agent_builder.otel-*  (trace index)
                                                                                       │
            ┌────────────────────────── FEEDBACK LOOP [PoC] ──────────────────────────┤
            │                                                                          ▼
            │   case_builder (TM task)          trace_classifier (TM task)     ┌──────────────┐
            │   traces ─► CASES ──────────────► classify ─► PATTERNS  ────────►│ Patterns &   │
            │   (.contextengine-cases)          (.contextengine-patterns)      │ improvements │
            │                                                                  │ panel (UI)   │
            │   Propose improvement ─► management agent authors a fix ─►       └──────┬───────┘
            │   IMPROVEMENTS (.contextengine-improvements) ─► update automation/skill/source
            └───────────────────────────────────────────────────────────────────────┘
```

The loop is a cycle: improvements change how KIs are produced or retrieved, agents run again, new traces
flow in, and the next pass measures whether the pattern shrank.

---

## 2. The feedback loop in depth [PoC]

**Vocabulary is load-bearing: `cases` / `patterns` / `improvements`. Never "issue" for the domain concept.**

The loop activates only when an ai_index is enabled for **self-improvement** — the user points it at a
trace index (`self_improvement: { enabled, traces_index }`). Trace scope is the **whole chosen trace index**;
there is no per-ai-index agent scoping.

### 2.1 Cases — one retrieval/tool event each

Built by the `case_builder` task, **deterministically**. Each case is one `execute_tool` span (a single
ES\|QL retrieval or tool call), keyed `_id = {trace_id}:{span_id}`.

- Tool spans are grouped by `trace_id` (one "round"); per-round **signals** are computed
  (`esql_count`, raw vs KI-retrieval counts, `looped = esql_count >= 3`, `fell_back_to_raw`).
- Per span: parse the tool-call arguments → `query`; parse the `FROM` clause → `target_index`; classify
  `query_kind` (`ki_retrieval` for `.ai-index`/`ki-`/`ai-index` targets, else `raw_access`); parse the
  result → `{ columns, row_count }`; `duration_ms = duration / 1e6` (raw OTel is nanoseconds).
- Each case is tagged `agent.class` (`user` | `management`), resolved via the `invoke_agent` span →
  `conversation.id` map, so the management agent's own analysis queries can be excluded from classification.
- Cases are written with `classified: false`.

### 2.2 Patterns — failure-mode clusters

Built by the `trace_classifier` task. It reads unclassified cases, labels them, and folds them into
**patterns** keyed `pattern_key = {type}:{sub_type}:{target_index}`.

**v1 classifier is deterministic (no LLM).** It emits three labels:

| Label | Condition |
| --- | --- |
| `query_error` | span status is `Error` |
| `empty_retrieval` | `row_count == 0` |
| `coverage_gap` | `query_kind == raw_access` (confidence `0.9` if the round looped, else `0.6`) |

Management-class cases are skipped. Each case is assigned a stable **partition** via a 32-bit string hash of
`round_id`: `dev` (0–69) / `eval` (70–84) / `regression` (85–99). Batching by `pattern_key`, `mergePattern`
rolls up `case_count`, first/last seen, representative case ids (max 5), partition tallies, and writes a
human-readable `summary` (`describePattern`) describing what was spotted. Looping rounds cluster into a
**single** `coverage_gap` pattern, not one-per-round.

### 2.3 Improvements — the fix (developer-in-the-loop)

From the Patterns panel a developer opens a pattern → reads summary/evidence/cases → opens a case →
**trace waterfall** → **Propose improvement**. This hands off to the Agent Builder **management-agent chat**
with the pattern attached; the agent authors a fix, stored as an **improvement**
(`action ∈ update_automation | create_ki_template | update_source | update_skill`).

**Manual apply — developer-in-the-loop.** Improvements are proposed and stored but applying them is a
human decision; there is no autonomous apply. Status starts `proposed`; the `applied/validated/regressed`
measurement transitions are **deferred** (see §9).

---

## 3. Plugin topology & load order

### 3.1 The dependency inversion

```
   agentBuilder  ──►  agentBuilderSml  ──►  contextEngine
   (loads first)                            (loads LAST)
```

Because `contextEngine` loads **before** Agent Builder, it **must NOT depend on `agentBuilder`** (server or
browser) — a direct dependency is a cycle and fails at boot. Registering the CE agent / tools / attachments
directly from context_engine is therefore forbidden.

**Resolution — inversion via `agent_builder_platform`:**

- `context_engine` *exports* `registerContextEngineAgentBuilder(...)` and exposes `getAiIndexService` +
  `getWorkflowsApi` on its setup contract. It does **not** call Agent Builder itself.
- The downstream **`agent_builder_platform`** plugin *does* require `agentBuilder` + `agentBuilderSml` and
  lists `contextEngine` in `optionalPlugins`. In its own `setup()` it calls
  `registerContextEngineAgentBuilder(...)`, wiring the agent/tools/attachments into Agent Builder.
- Same inversion on the browser for chat: context_engine exposes `registerChatOpener(opener)` on its start
  contract; `agent_builder_platform` registers an opener that forwards to `agentBuilder.openChat(...)`
  (register the opener **first**, then attachment-UI, guarded by try/catch). See [`interfaces.md`](./interfaces.md).

> Also **do not** add `@kbn/workflows-management-plugin` as a project ref — it transitively re-introduces the
> same cycle. Type the workflows API with a local `WorkflowsManagementApiLike` interface instead.

### 3.2 Manifest (`kibana.jsonc`)

**[MERGED] today:**
```jsonc
"requiredPlugins": ["actions", "features", "share", "esql", "triggersActionsUi"],
"optionalPlugins": ["console", "workflowsManagement"],
"requiredBundles": ["kibanaReact", "actions"]
```

**[PoC] the loop additionally needs:** `data` (required — the trace waterfall's `data.search.search`) and
`taskManager` (optional, setup + start — runs the two tasks). `workflowsManagement` (optional) saves/reads
the KI-creation workflows. `agent_builder_platform` adds `contextEngine` to its `optionalPlugins`
(server + browser).

---

## 4. Runtime components — the two tasks [PoC]

The loop runs as **Task Manager tasks**, not Workflows and not automations.

| Task | Type id | Instance id | Interval | Role |
| --- | --- | --- | --- | --- |
| `case_builder` | `contextEngine:caseBuilder` | `contextengine-case-builder-${aiIndexId}` | `1h` | traces → cases (deterministic) |
| `trace_classifier` | `contextEngine:traceClassifier` | `contextengine-trace-classifier-${aiIndexId}` | `1h` | cases → labels → patterns |

**Why TM tasks (not Workflows):** TM tasks run as the internal user with no request/space, so enable-time
scheduling is trivial and runners use `asInternalUser`. Workflows remain only for the agent-authored
**fix** / KI-creation flow.

> **⚠ OPEN QUESTION — flag for reconciliation:** delivery epic [#15572](https://github.com/elastic/search-team/issues/15572)
> text says the loop should run as **"Kibana workflows."** The merged/PoC implementation uses **Task Manager
> tasks**. This discrepancy is intentional (see rationale above) but should be reconciled with the epic.

**Scheduling & cold-start chain.** Enabling self-improvement schedules both tasks (`ensureScheduled`);
disabling removes them (`removeIfExists`). Because both are scheduled at the same time, the classifier can
run before any cases exist → 0 patterns. Fix: after a successful write, `case_builder` chains
`getTaskManager()?.runSoon(traceClassifierTaskId(aiIndexId))` so patterns appear promptly. `runSoon` lives on
the **start** contract (`TaskManagerStartContract`), read lazily. Task runners **must** return
`{ state: { ... } }` (never `{}`); `case_builder` returns `{ state: { watermark } }` (max case `@timestamp`).

> Never write system indices directly (e.g. nudging `.kibana_task_manager`) — the sandbox blocks it; use
> `runSoon`.

---

## 5. Storage

### 5.1 AI index model [MERGED, extended by PoC]

AI index metadata lives in the hidden `.contextengine-ai-indices` system index, read/written by the internal
user via `AiIndexService` (access enforced at the API layer). Properties: `dest`, `sources`, `automations`,
`description`. **[PoC]** adds `self_improvement: { enabled, traces_index }`, an automation `role` (`ki_creation`),
and a `patch(id, Partial<AiIndexProperties>)` for partial updates (omitted fields preserved — never `put`).

### 5.2 Three self-improvement indices [PoC]

All use `@kbn/storage-adapter` (`StorageIndexAdapter`), auto-created on first write. The storage client has
**no `deleteByQuery`** — reset/purge uses raw `esClient.deleteByQuery`.

| Index | Doc / `_id` | Purpose |
| --- | --- | --- |
| `.contextengine-cases` | `CaseDocument` · `{trace_id}:{span_id}` | One retrieval/tool event; written by `case_builder`, labeled by `trace_classifier`. |
| `.contextengine-patterns` | `PatternDocument` · `pattern_key` | Failure-mode cluster with rolled-up evidence & summary. |
| `.contextengine-improvements` | `ImprovementDocument` · `improvement_id` | A proposed/applied fix targeting an automation/skill/source. |

Each store gets a small service (`ensureIndex`, `write/upsert`, `list`, `get`, `setStatus`,
`deleteByAiIndex`), instantiated in `plugin.start()`. Exact field-level schemas are in
[`interfaces.md`](./interfaces.md) — not duplicated here.

---

## 6. Agent Builder integration [PoC]

Wired **from `agent_builder_platform`**, never from context_engine (§3.1). Ids live in
`common/agent_builder/constants.ts`.

| Kind | Id(s) |
| --- | --- |
| **Management agent** | `platform.context_engine.agent`, skills `['context-engine-setup', 'propose-improvement']` |
| **Tools** | `platform.context_engine.{get_ai_index, update_ai_index, save_automation}` (`save_automation` role `ki_creation` — creates/updates a workflow + links it via `service.patch`) |
| **Attachments** | `platform.context_engine.{ai_index, pattern, case}` |

**Attachments provide bounded, on-demand tools** (via `format → getBoundedTools`):
- `ai_index` attachment → `get_ai_index_automations` (fetches linked workflows' YAML).
- `case` attachment → `get_case_trace` (runs ES\|QL over the configured `traces_index` for the trace).
- The bounded set also grants platform core tools (executeEsql / generateEsql / listIndices /
  getIndexMapping) plus CE `getAiIndex` / `saveAutomation`.

**Skills** (conceptual): the **setup skill** teaches the agent the available ai_indices, their backing
objects, and how to run FORK+FUSE hybrid retrieval; the **propose-improvement skill** authors fixes from a
pattern. New agent/tool/attachment/skill ids must be added to the Agent Builder **allow-lists**
(`agent-builder-server/allow_lists.ts`) — owned by `@elastic/workchat-eng`, needs their review.

---

## 7. Trace visualization [PoC]

**Reuse, don't build.** `@kbn/llm-trace-waterfall` already renders the `traces-agent_builder.otel-*` OTel
shape and needs only `data.search.search`. The case flyout builds an ES trace fetcher over the ai_index's
`self_improvement.traces_index` and renders `<TraceWaterfall>` keyed on the case's `round_id`. Do **not**
deep-link to APM (APM reads its own indices) and do not hand-roll a waterfall. See [`interfaces.md`](./interfaces.md)
for the fetcher wiring.

---

## 8. Feature flag

Everything is gated on the advanced setting **`contextEngine:enabled`**
(`CONTEXT_ENGINE_ENABLED_SETTING_ID` from `@kbn/management-settings-ids`), **disabled by default**.

- **Server [MERGED]:** every route is wrapped so it returns **404** while the setting is off.
- **Browser [MERGED]:** the app registers as `AppStatus.inaccessible` and flips to `accessible` via a
  `uiSettings.get$(CONTEXT_ENGINE_ENABLED_SETTING_ID)` updater; while inaccessible core also hides it from
  navigation.

---

## 9. What's deferred / v1 limitations [PoC]

From PR #282241's "deferred" section — **do not assume these exist:**

- **Improvements have no UI surface** — created via chat and stored, but not listed in the panel.
- **Classifier LLM refinement** (`missing_fact` / `ambiguous_ki` / `stale_ki`) and **emerging / similarity
  clustering** — v1 is exact-key + deterministic only (needs KI retrieval to exist first).
- **Measurement loop** — `improving` / `resolved` status transitions and baseline-vs-candidate scoring are
  not wired; most patterns read `open`.
- **Placeholder metrics** — `confidence` is always `1`, `frequency == case_count`, and
  `impact` / `affected_versions` are unpopulated in v1.
- **Tests + `i18n_check`** for the new surface not yet run.
- **Codeowners:** `allow_lists.ts`, `agent_builder_platform`, and the `@kbn/llm-trace-waterfall` dependency
  are owned by Agent Builder (`@elastic/workchat-eng`) and need their review.

---

## 10. Cross-references

- Exact schemas, contracts, route paths, ids, and function signatures → [`interfaces.md`](./interfaces.md).
- Coding rules, gotchas, and build/verify steps → [`conventions.md`](./conventions.md).
- Skill overview → [`SKILL.md`](./SKILL.md).
