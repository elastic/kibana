# Context Engine — Interfaces & Contracts

Reference for the **Context Engine** (part of Agent Builder). Exact HTTP routes, plugin contracts,
document schemas, Agent Builder ids, and the Workflows API. For architecture/data-flow see
[`architecture.md`](./architecture.md); for coding rules & gotchas see [`conventions.md`](./conventions.md).

- **Plugin:** `x-pack/platform/plugins/shared/context_engine/` · plugin id `contextEngine` · package `@kbn/context-engine-plugin`.
- **Tracking:** workstream [search-team#15386](https://github.com/elastic/search-team/issues/15386), epic [#15572](https://github.com/elastic/search-team/issues/15572).
- **[PoC] source of truth:** draft PR [elastic/kibana#282241](https://github.com/elastic/kibana/pull/282241).

> **Status legend:** **[MERGED]** = in `main` today · **[PoC]** = specified in PR #282241, not yet merged.
> The [PoC] feedback-loop entities below use the vocabulary **cases / patterns / improvements** (never "issue" for that domain concept).

---

## 1. HTTP API

Constants in `common/constants.ts`. All routes are **versioned**, `access: 'public'`, version
`AI_INDEX_API_VERSION = '2023-10-31'`, and every handler is wrapped in `withContextEngineFeatureFlag`
(returns **404** when the advanced setting `CONTEXT_ENGINE_ENABLED_SETTING_ID` — id `contextEngine:enabled`,
registered by `agent_builder_sml` — is off). Privileges: READ = `contextEngine:read`, WRITE = `contextEngine:write`
(`apiPrivileges` in `common/features.ts`).

**Path constants**

```ts
publicApiPath          = '/api/context_engine'
aiIndexPath            = `${publicApiPath}/ai_index`
aiIndexByIdPath        = `${aiIndexPath}/{aiIndexId}`
// [PoC] additions:
aiIndexSelfImprovementPath     = `${aiIndexByIdPath}/self_improvement`
traceIndicesPath               = `${publicApiPath}/trace_indices`
aiIndexPatternsPath            = `${aiIndexByIdPath}/patterns`
aiIndexPatternCasesPath        = `${aiIndexByIdPath}/patterns/cases`
aiIndexPatternImprovementsPath = `${aiIndexByIdPath}/patterns/improvements`
```

### 1.1 AI-index routes — [MERGED] (`server/routes/ai_indices.ts`)

| Method | Path | Priv | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| POST | `aiIndexPath` | WRITE | body `CreateAiIndexRequest` (`{id, ...AiIndexProperties}`) | `201` `CreateAiIndexResponse` `{status:'created'}` | 409 if id exists. Validates connector sources. |
| PUT | `aiIndexByIdPath` | WRITE | params `{aiIndexId}`, body `AiIndexProperties` | `201`/`200` `PutAiIndexResponse` `{status:'created'\|'updated'}` | Full replace, OCC; managed entries immutable (409). |
| GET | `aiIndexByIdPath` | READ | params `{aiIndexId}` | `200` `GetAiIndexResponse` (=`AiIndexHttpItem`) | 404 if missing. |
| GET | `aiIndexPath` | READ | — | `200` `ListAiIndexResponse` `{ai_indices: AiIndexHttpItem[]}` | Capped at `MAX_AI_INDICES=100`, sorted by id. |
| DELETE | `aiIndexByIdPath` | WRITE | params `{aiIndexId}` | `200` `DeleteAiIndexResponse` `{acknowledged:true}` | Deletes entry only; backing indices untouched; managed → 409. |

All emit audit events (`server/routes/audit_events.ts`). Errors map: `InvalidAiIndexDest`/`InvalidConnectorSource`→400,
`AiIndexNotFound`→404, `AiIndexManaged`/`AiIndexConflict`/`AiIndexAlreadyExists`→409.

### 1.2 Self-improvement routes — [PoC] (`server/routes/self_improvement.ts`)

| Method | Path | Priv | Request | Response | Behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `aiIndexSelfImprovementPath` | WRITE | params `{aiIndexId}`, body `{traces_index: string}` (1–`MAX_AI_INDEX_TRACES_INDEX_LENGTH=1024`) | `200` `SelfImprovementResponse` `{enabled:true}` | Enable: `patch(self_improvement:{enabled:true,traces_index})` → `ensureIndex()×3` → schedule both TM tasks. |
| DELETE | `aiIndexSelfImprovementPath` | WRITE | params `{aiIndexId}` | `200` `{enabled:false}` | **Reset**: `patch({enabled:false,traces_index:''})` → unschedule tasks → `Promise.all` `deleteByAiIndex` on cases/patterns/improvements. |
| GET | `traceIndicesPath` | READ | — | `200` `ListTraceIndicesResponse` `{indices: string[]}` | `resolveIndex('traces-*')` → sorted unique names; index-not-found → `{indices:[]}`. |

### 1.3 Patterns & improvements routes — [PoC] (`server/routes/patterns.ts`)

| Method | Path | Priv | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `aiIndexPatternsPath` | READ | params `{aiIndexId}` | `200` `ListPatternsResponse` `{patterns: Pattern[]}` |
| GET | `aiIndexPatternCasesPath` | READ | params `{aiIndexId}`, query `{pattern_key}` (1–1024) | `200` `ListPatternCasesResponse` `{cases: PatternCase[]}` (`size:100`) |
| GET | `aiIndexPatternImprovementsPath` | READ | params `{aiIndexId}`, query `{pattern_key}` | `200` `ListImprovementsResponse` `{improvements: Improvement[]}` |

Wire types in `common/http_api/patterns.ts`. All feature-flag-gated like §1.1.

---

## 2. Plugin contracts

### 2.1 Server — `ContextEnginePluginSetup` (`server/types.ts`)

| Member | Signature | Status | Purpose |
| --- | --- | --- | --- |
| `registerAiIndex` | `(id: string, properties: AiIndexProperties) => void` | [MERGED] | Register a **managed** AI index at setup; upserted via `putManaged` on start (throws if called after start). |
| `getAiIndexService` | `() => AiIndexService` | [PoC] | Hands the AI-index service to a downstream integrator (see §2.3) — inversion point. |
| `getWorkflowsApi` | `() => WorkflowsManagementApiLike \| undefined` | [PoC] | Exposes the local workflows API (`= workflowsManagement?.management`) for the `save_automation` tool / automations. |

**Setup deps** `ContextEngineSetupDependencies`: `features` (req), `taskManager?` (`TaskManagerSetupContract`) [PoC], `workflowsManagement?: {management: WorkflowsManagementApiLike}` [PoC].
**Start deps** `ContextEngineStartDependencies`: `actions` (req, connector-source validation), `taskManager?` (`TaskManagerStartContract`) [PoC].
`ContextEnginePluginStart` is currently **empty**.

`WorkflowsManagementApiLike` (locally declared to avoid a project-ref cycle):

```ts
interface WorkflowsManagementApiLike {
  createWorkflow(cmd: {yaml: string; id?: string}, spaceId: string, request: KibanaRequest): Promise<{id: string}>;
  updateWorkflow(id: string, cmd: {yaml: string}, spaceId: string, request: KibanaRequest): Promise<unknown>;
  getWorkflow(id: string, spaceId: string): Promise<{yaml?: string; name?: string} | null>;
}
```

### 2.2 Browser — `ContextEnginePluginStart` (`public/types.ts`)

| Member | Signature | Status | Purpose |
| --- | --- | --- | --- |
| `registerChatOpener` | `(opener: ChatOpener) => void` | [PoC] | Downstream (`agent_builder_platform`) registers how to open Agent Builder chat; CE's UI opens chat through it. Inversion — CE must not depend on Agent Builder. |

Browser setup contract is empty. **Start deps** `ContextEngineStartDependencies`: `share`, `triggersActionsUi` (req), `console?`, and `data` [PoC] (for the trace waterfall via `data.search.search`).

```ts
type ChatOpener = (options: OpenChatOptions) => void;
interface OpenChatOptions { agentId?: string; newConversation?: boolean; autoSendInitialMessage?: boolean;
                            initialMessage?: string; attachments?: ChatAttachmentInput[]; }
interface ChatAttachmentInput { type: string; data: unknown; }
```

### 2.3 Cross-plugin extension points — [PoC]

Registered from **`agent_builder_platform`** (which requires `agentBuilder` + `agentBuilderSml`, adds `contextEngine` to `optionalPlugins`), NOT from context_engine — load order is `agentBuilder → agentBuilderSml → contextEngine`.

```ts
// server — server/agent_builder/index.ts
registerContextEngineAgentBuilder({
  agentBuilder: AgentBuilderPluginSetup,
  getAiIndexService: () => AiIndexService,
  getWorkflowsApi: () => WorkflowsManagementApiLike | undefined,
}): void
// registers: 3 tools, 3 attachment types, 2 skills, 1 agent (see §4)

// browser — agent_builder_platform/public/plugin.tsx start():
// register opener FIRST, then attachment-UI (guarded by try/catch):
contextEngine?.registerChatOpener(options => agentBuilder.openChat(options as ...));
```

### 2.4 `AiIndexService` surface — [MERGED] (`server/ai_indices/service.ts`)

`create(id, props)` · `put(id, props): 'created'|'updated'` (OCC, rejects managed) · `putManaged(id, props)` (idempotent upsert; rejects unmanaged squatter with `AiIndexIdConflictError`) · `get(id): AiIndexHttpItem` · `list(): AiIndexHttpItem[]` · `delete(id)`. Backing store: hidden system index `.contextengine-ai-indices` via `@kbn/storage-adapter`, all through the internal user.
**[PoC] adds** `patch(id, Partial<AiIndexProperties>)` (partial update; never `put` — preserves omitted fields; used by self-improvement enable/reset).

---

## 3. Data model / document schemas

### 3.1 AI index model (`common/http_api/ai_indices.ts`)

```ts
type AiIndexType = 'data_stream' | 'index';
interface AiIndexDest   { type: AiIndexType; value: string; }       // value: 'ai-index-ds-*' | 'ai-index-idx-*'
type AiIndexSourceType  = 'esql' | 'connector';
interface AiIndexSource { type: AiIndexSourceType; value: string; }
interface AiIndexAutomation {
  type: 'workflow'; value: string;                                   // value = workflow id
  role?: AiIndexAutomationRole;   // [PoC] only 'ki_creation' today
  managed?: boolean;              // [PoC] true = management-agent-owned/rewritable
}
interface AiIndexSelfImprovement { enabled: boolean; traces_index: string; }   // [PoC]

interface AiIndexProperties {
  description?: string;
  dest: AiIndexDest;
  automations: AiIndexAutomation[];
  sources: AiIndexSource[];
  self_improvement?: AiIndexSelfImprovement;   // [PoC]
}
interface AiIndexHttpItem extends AiIndexProperties {   // wire item
  id: string; managed: boolean; date_created: string; date_modified: string;
}
```

> **Merged vs gist divergence:** in `main`, `AiIndexAutomation` is `{type,value}` only and `AiIndexProperties`
> has no `self_improvement`. `role`/`managed`/`self_improvement` and `AiIndexAutomationRole` are **[PoC]** additions.

**AI-index `_id` = the AI index id** (user-supplied, `MAX_AI_INDEX_ID_LENGTH=256`, validated by `validateAiIndexId`).

### 3.2 Feedback-loop documents — [PoC]

Three storage indices via `@kbn/storage-adapter` (auto-create on first write; **no `deleteByQuery`** on the client — reset uses raw `esClient.deleteByQuery`). Each store service exposes `{ensureIndex, write/upsert, list, get, setStatus, deleteByAiIndex}`.

#### `.contextengine-cases` — `CaseDocument` · `_id = {trace_id}:{span_id}`

One retrieval/tool event. `[B]` written by case_builder, `[C]` by classifier.

| Field | Type | Src | Meaning |
| --- | --- | --- | --- |
| `case_id` | keyword | B | `{trace_id}:{span_id}` |
| `ai_index_id` | keyword | B | owning AI index |
| `conversation_id` | keyword | B | `gen_ai.conversation.id` |
| `round_id` | keyword | B | `= trace_id` (one round) |
| `span_id` | keyword | B | span id |
| `tool_call_id` | keyword | B | `gen_ai.tool.call.id` |
| `@timestamp` | date | B | event time |
| `agent` | obj `{name,id,class}` kw | B | `class = user\|management` |
| `tool` | keyword | B | `gen_ai.tool.name` |
| `query` | text | B | ES\|QL text (nullable) |
| `query_kind` | keyword | B | `ki_retrieval\|raw_access\|other` |
| `target_index` | keyword | B | parsed from FROM clause |
| `returned` | obj `{columns:kw[],row_count:long}` | B | result shape |
| `status` | keyword | B | `Ok\|Error` |
| `error` | text | B | error message |
| `duration_ms` | double | B | OTEL `duration` (ns) ÷ 1e6 |
| `round_signals` | obj `{esql_count,raw_query_count,ki_retrieval_count:long, looped,fell_back_to_raw:bool}` | B | per-round rollup |
| `classified` | boolean | B/C | B writes `false`; C sets `true` |
| `labels` | nested `{type,sub_type:kw, confidence:double}` | C | classifier labels |
| `pattern_key` | keyword | C | assigned pattern |
| `partition` | keyword | C | `dev\|eval\|regression` |
| `classifier_version` | keyword | C | classifier version |

#### `.contextengine-patterns` — `PatternDocument` · `_id = pattern_key`

`pattern_key = {type}:{sub_type}:{target_index}`.

| Field | Type | Meaning |
| --- | --- | --- |
| `pattern_key` | keyword | `{type}:{sub_type}:{target_index}` |
| `type` / `sub_type` | keyword | failure mode (e.g. `coverage_gap`, `query_error`, `empty_retrieval`) |
| `ai_index_id` | keyword | owning AI index |
| `status` | keyword | `open\|improving\|resolved` (`PatternStatus`) |
| `summary` | text | classifier-written 1–2 sentence description (plain text, no backticks) |
| `evidence` | obj `{case_count:long, first_seen,last_seen:date, frequency,confidence:double, impact:kw, affected_versions:kw[], representative_case_ids:kw[]}` | rollup (max 5 rep ids) |
| `partitions` | obj `{dev_count,eval_count,regression_count:long}` | partition tallies |

#### `.contextengine-improvements` — `ImprovementDocument` · `_id = improvement_id`

| Field | Type | Meaning |
| --- | --- | --- |
| `improvement_id` | keyword | id |
| `pattern_key` | keyword | pattern it fixes (many-to-one) |
| `ai_index_id` | keyword | owning AI index |
| `status` | keyword | `proposed\|applied\|validated\|regressed\|rejected` (`ImprovementStatus`) |
| `action` | keyword | `update_automation\|create_ki_template\|update_source\|update_skill` |
| `target` | keyword | workflow id / skill / source changed |
| `change_summary` | text | what changed |
| `proposed_at` / `applied_at` | date | timestamps |
| `measurement` | obj `{baseline_results,candidate_results:flattened, verdict:kw}` | `verdict = improved\|no_change\|regressed` |

> Wire `Pattern`/`PatternCase`/`Improvement` in `common/http_api/patterns.ts` mirror these (most fields optional on the wire; `measurement` not surfaced).

---

## 4. Agent Builder extension surface — [PoC]

Ids in `common/agent_builder/constants.ts`. Registered by `registerContextEngineAgentBuilder` (§2.3). Ids
must be mirrored in the allow-lists `agent-builder-server/allow_lists.ts` (owned by `@elastic/workchat-eng`).

| Kind | Id | Notes |
| --- | --- | --- |
| **Agent** | `CONTEXT_ENGINE_AGENT_ID` = `platform.context_engine.agent` | Management agent; `skill_ids: ['context-engine-setup','propose-improvement']`. |
| **Skill** | `CONTEXT_ENGINE_SETUP_SKILL_ID` = `context-engine-setup` | Sources → KI-creation automations; AI-index awareness + ES\|QL retrieval. |
| **Skill** | `PROPOSE_IMPROVEMENT_SKILL_ID` = `propose-improvement` | Pattern → concrete improvement. |
| **Tool** | `contextEngineToolIds.getAiIndex` = `platform.context_engine.get_ai_index` | Read an AI index. |
| **Tool** | `contextEngineToolIds.updateAiIndex` = `platform.context_engine.update_ai_index` | Update AI index props. |
| **Tool** | `contextEngineToolIds.saveAutomation` = `platform.context_engine.save_automation` | role `ki_creation`: create/update workflow via workflows API + link via `service.patch`. Registered even when workflows unavailable (errors at call time). zod input `{ai_index_id, yaml, workflow_id?}`. |
| **Attachment** | `AI_INDEX_ATTACHMENT_TYPE` = `platform.context_engine.ai_index` | payload = AI index; → bounded `get_ai_index_automations`. |
| **Attachment** | `PATTERN_ATTACHMENT_TYPE` = `platform.context_engine.pattern` | payload = pattern; used by "Propose improvement". |
| **Attachment** | `CASE_ATTACHMENT_TYPE` = `platform.context_engine.case` | payload `{case, ai_index_id, traces_index?, pattern?}`; → bounded `get_case_trace`. |

### 4.1 Attachment-bounded on-demand tools (`getBoundedTools`)

- **`get_case_trace`** (case attachment) — id `${CASE_ATTACHMENT_TYPE}.get_case_trace.${idSafe(case_id)}`. Runs ES\|QL over the case's `traces_index` via `esClient.asCurrentUser.esql.query`:
  `FROM <traces_index> | WHERE trace_id == "<id>" | KEEP @timestamp, span_id, gen_ai.operation.name, gen_ai.tool.name, gen_ai.tool.call.arguments, gen_ai.tool.call.result, duration, status.code, status.message | SORT @timestamp ASC | LIMIT 200`. Returns `{trace_id, index, span_count, spans}`.
- **`get_ai_index_automations`** (ai_index attachment) — id `${AI_INDEX_ATTACHMENT_TYPE}.get_automations.${idSafe(id)}`. Fetches YAML of each linked `type:'workflow'` automation via `getWorkflowsApi().getWorkflow(value, spaceId)`. Returns `{ai_index_id, automations:[{workflow_id, role, yaml} | {workflow_id, error}]}`.

Bounded tool set also grants the platform core tools (executeEsql/generateEsql/listIndices/getIndexMapping) + CE getAiIndex/saveAutomation. Attachment defs are widened `as AttachmentTypeDefinition` at registration. Browser attachment-UI defs live in `agent_builder_platform/public/attachment_types/` using **locally-duplicated** id constants (`import type` only across bundles).

---

## 5. Workflows API — [PoC]

The KI-automation flow (`save_automation` tool + automations) calls Kibana Workflows (space-scoped store `.workflows-workflows-000001`). CE types it locally as `WorkflowsManagementApiLike` (§2.1) — no project ref, to avoid the `context_engine → workflows_management → agent_builder_sml → context_engine` cycle.

| Method | Endpoint | Access / Version | Body / Notes |
| --- | --- | --- | --- |
| POST | `/api/workflows/workflow` | public · `2023-10-31` | `{yaml, id?}` — **id pattern `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$` (NO underscores)** |
| POST | `/api/workflows/validate` | internal · `1` | header `x-elastic-internal-origin: kibana` |
| PUT | `/api/workflows/workflow/{id}` | — | `{yaml}` update |
| POST | `/api/workflows/workflow/{id}/run` | — | `{inputs:{}}` |
| GET | `/api/workflows` | — | list — param is **`size`**, not `limit` |
| GET | `/api/workflows/executions/{id}` | — | execution status |

Workflow YAML idioms & fixes (see [`conventions.md`](./conventions.md) §Workflows): `@timestamp` epoch fix `{{ execution.startedAt | date: "%s" }}000`; `random_score`/`function_score` stripped by the search-step schema (use `match_all`); workflows are space-scoped (create/list/run in the right space).

---

## Appendix — Task Manager tasks — [PoC]

Not HTTP, but part of the contract (`common/constants.ts`). Scheduled on self-improvement enable, removed on reset; run as internal user (`asInternalUser`), interval `SELF_IMPROVEMENT_SCHEDULE_INTERVAL='1h'`.

| Constant | Value |
| --- | --- |
| `CASE_BUILDER_TASK_TYPE` | `contextEngine:caseBuilder` |
| `TRACE_CLASSIFIER_TASK_TYPE` | `contextEngine:traceClassifier` |
| `caseBuilderTaskId(aiIndexId)` | `contextengine-case-builder-${aiIndexId}` |
| `traceClassifierTaskId(aiIndexId)` | `contextengine-trace-classifier-${aiIndexId}` |

Task `run()` must return `{ state: {...} }` (never `{}`); case_builder chains `runSoon(traceClassifierTaskId)` after a non-empty write (cold-start race). See [`conventions.md`](./conventions.md).
