# Context Engine — coding & working conventions

A prescriptive do/don't reference for working inside the Context Engine plugin
(`x-pack/platform/plugins/shared/context_engine/`, plugin id `contextEngine`,
package `@kbn/context-engine-plugin`, owner `@elastic/context-eng`).

The Context Engine team owns several workstreams that all live in this plugin:
**sources**, **KI-creation automations** (workflows), the **setup skill**, the
**retrieval skill**, **agent traces**, and the **feedback loop**
(cases → patterns → improvements). These conventions are team-wide and apply to
**all** of them. The feedback loop is one workstream and is still a PoC — not yet
merged (PR [elastic/kibana#282241](https://github.com/elastic/kibana/pull/282241));
where a rule is specific to it, it is called out as **(feedback-loop specific)**.

This file is the **rules**. For the *why* behind the shape of the system read
[`architecture.md`](./architecture.md); for exact contracts/signatures read
[`interfaces.md`](./interfaces.md). Do not re-derive either here.

Repo-wide rules still apply and are not reproduced: see the root
[`STYLEGUIDE.mdx`](../../../STYLEGUIDE.mdx), `CONTRIBUTING.md`, and the Kibana
`.claude/CLAUDE.md` code-style section (snake_case filenames, `import type`,
no `any`, bound every `schema.string()` with `maxLength`, no `@ts-ignore`,
follow existing patterns in the target file first).

---

## Vocabulary

- The store is an **`ai_index`** holding **Knowledge Items (KIs)**; the trace source is a **traces index**.
- **Never use "issue"** for a domain concept — "issue" is reserved for GitHub issues.
- **(feedback-loop specific)** the loop workstream uses exactly three nouns — **cases → patterns → improvements** (a *case* is one observed underperformance instance, a *pattern* clusters recurring cases, an *improvement* is a developer-reviewed fix); its config flag lives under `self_improvement` (`{enabled, traces_index}`).

---

## Architectural invariants (never violate)

- **`context_engine` must never depend on `agentBuilder`** (server *or* browser). Load order is `agentBuilder → agentBuilderSml → contextEngine`; a direct dependency is a cycle and the build fails.
  - Integration is **inverted**: context_engine *exports* `registerContextEngineAgentBuilder(...)` and exposes `getAiIndexService` / `getWorkflowsApi` on its setup contract. The downstream **`agent_builder_platform`** plugin (which *does* require `agentBuilder`) calls it from its own `setup()`. Same inversion on the browser for chat (`registerChatOpener`).
- **Do NOT add `@kbn/workflows-management-plugin` as a project ref** (tsconfig `kbn_references`) — it transitively re-introduces the cycle. Type the workflows API with a **local `WorkflowsManagementApiLike`** interface instead.
- **No cross-bundle value imports between plugins.** Across a bundle boundary use `import type` only; duplicate the small constants locally (e.g. attachment-type ids in `agent_builder_platform`). Runtime `import { CONST } from '@kbn/context-engine-plugin/public'` is fragile and breaks at load time.
- **Never `import` from `./plugin` at `server/index.ts`.** Use `import type` and `await import('./plugin')` inside the async initializer (enforced by `@kbn/eslint/no_sync_import_from_plugin`).

---

## Feature flag

- Everything user-facing is gated on the advanced setting **`contextEngine:enabled`** (`CONTEXT_ENGINE_ENABLED_SETTING_ID` from `@kbn/management-settings-ids`).
- **Every route** is wrapped in `withContextEngineFeatureFlag(...)` — it returns **404 when the flag is off**. No new route ships unwrapped.
- The **browser app** registers as `AppStatus.inaccessible` and flips to accessible via a `uiSettings.get$(...)` updater. When off, the app is not reachable.
- If you add a surface (route, app link, task), confirm it is dark when the flag is off before merging.

---

## Server patterns

### Storage & services
- Storage goes through **`@kbn/storage-adapter`** (`StorageIndexAdapter`) — it **auto-creates the index on first write**; do not pre-create by hand.
- The storage client has **no `deleteByQuery`**. For reset/purge use raw `esClient.deleteByQuery({ index, refresh: true, conflicts: 'proceed', query: { term: { ai_index_id } } })`; return `.deleted`; treat index-not-found as `0`.
- Each store/service exposes the same service-surface shape (e.g. `{ ensureIndex, write/upsert, list, get, setStatus, deleteByAiIndex }` — the feedback-loop `cases` / `patterns` / `improvements` stores are one example). **Instantiate every service in `plugin.start()`** and hand it to routes/tasks via **getter closures**, never as eagerly-captured values.
- AI-index updates use **`patch(id, Partial<AiIndexProperties>)`** — partial merge, omitted fields preserved. **Never `put`** to update (it drops fields).

### Routes
- All routes are **versioned** with `AI_INDEX_API_VERSION` and `access: 'public'`, registered via the versioned router `.addVersion({ version: AI_INDEX_API_VERSION, ... }, withContextEngineFeatureFlag(handler))`.
- Every route declares a **privilege** via `RouteSecurity` — read routes use `apiPrivileges.readContextEngine`, writes use `apiPrivileges.writeContextEngine`.
- Routes that render a trace also need `getAiIndexService` (the waterfall reads the AI index's configured `traces_index`).

### Task Manager (any background task you add)
- Background work runs as **Task Manager tasks** — TM runs as the internal user with `asInternalUser`; no request/space. Not Workflows, not automations.
- **Task runners must return `{ state: { ... } }`** — never `{}`. A runner with no meaningful state returns a populated wrapper with an empty inner (`{ state: {} }`); one that tracks progress returns e.g. `{ state: { watermark } }`. A bare `{}` return breaks TM state handling.
- **`runSoon` lives on the *start* contract** (`TaskManagerStartContract`). If a task needs to chain/nudge another task, read the start contract **lazily** off a closure set from `plugin.start()` — do not capture it at setup.
- **Never write/nudge system indices directly** (e.g. `.kibana_task_manager`) to trigger a run — the sandbox blocks it. Use `runSoon`.

---

## Browser patterns

- **react-query is v4** — the loading flag is **`isLoading`, not `isPending`**. `isPending` does not exist here.
- Thread services (`data`, `share`, `console`, `getChatOpener`) through a single flat `ContextEngineServices` object in `mount.tsx` + `use_kibana.ts`; don't reach for globals.
- **Chat bridge order matters:** in `agent_builder_platform` `start()`, **register the chat opener FIRST**, then wrap the attachment-UI registration in `try/catch` so a failure there can't abort the bridge. Guard availability with `isAvailable = Boolean(opener)`.
- **Use `console.info`, not `console.debug`, for the `[ce:chat-bridge]` breadcrumbs** — `console.debug` is hidden at Chrome's default log level.
- **Line-clamp / fixed height: use the `style` prop, not the emotion `css` prop.** The emotion `css` prop on intrinsic `<div>`/`<p>` can trip typing; `style` is the safe path for clamp/height.
- **TS2774 gotcha:** `data.search.search` is *always defined*, so `Boolean(data?.search?.search && ...)` trips "condition always true". Gate on the **data values** (e.g. `tracesIndex && round_id`), never on the function's truthiness.
- Reuse `@kbn/llm-trace-waterfall` for any trace view (`createEsTraceFetcher` + `useTraceSpans` + `<TraceWaterfall>`); do not hand-roll a waterfall or deep-link to APM.

---

## Workflows (KI automation) idioms

Workflows author KIs into an AI index's backing store; they are **space-scoped** — create/list/run in the correct space, and pass the right connector id.

- **`@timestamp` epoch fix:** raw `{{execution.startedAt}}` is a JS Date string ES rejects. Use LiquidJS `{{ execution.startedAt | date: "%s" }}000` (epoch millis).
- **`random_score` / `function_score` are stripped** by the search-step schema → use `match_all` for sampling.
- **Workflow id: no underscores.** Must match `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$` (hyphens only).
- **List param is `size`, not `limit`** (`GET /api/workflows`).
- Use `METADATA _id` in the source ES|QL when the data's own id field may be null; KI id = `{source}/{{foreach.item[0]}}`.
- After saving a workflow, **link it** to the AI index automation list (`role: ki_creation`) via `service.patch`, then run.

---

## i18n

- **Every user-facing string** goes through `i18n.translate(...)` or `<FormattedMessage>` — no bare string literals in JSX/copy.
- **All ids are namespaced under `xpack.contextEngine.*`** (e.g. `xpack.contextEngine.aiIndexDetail.description.title`). Mirror the component path in the id.
- Verify with `node scripts/i18n_check` (`--fix` to auto-register); see `kbn-i18n/GUIDELINE.md`.

---

## Tooling & verification

- **Type check with Node 24** (`nvm use 24.18.0`) — older Node fails the build. Scope to the project:
  ```
  node scripts/type_check --project x-pack/platform/plugins/shared/context_engine/tsconfig.json
  ```
  Also type-check `agent_builder_platform` when you touch the bridge.
- **Lint:** `node scripts/eslint <files>` (`--fix` for prettier). **Do not pass `.jsonc` files to eslint** — it can't parse them.
- **i18n:** `node scripts/i18n_check`.
- **Jest:** `node scripts/jest <testfile>` (config auto-discovered from the test path).
- **tsconfig `kbn_references`:** add refs for new deps you import (e.g. `@kbn/data-plugin`, `@kbn/llm-trace-waterfall`, `@kbn/task-manager-plugin`, `@kbn/storage-adapter`) — **but never `@kbn/workflows-management-plugin`** (cycle; type it locally).
- Reviewer boundaries: `context_engine` is `@elastic/context-eng`; `allow_lists.ts`, `agent_builder_platform`, the `agentBuilder` tracing surface, and the `@kbn/llm-trace-waterfall` dependency are `@elastic/workchat-eng` — request their review when you touch those.

---

## Testing

Unit-test the **pure** logic and **registration presence**:

- Pure derive/transform helpers: keep them free of I/O so they can be exercised directly with fixtures.
- `patch` (partial merge preserves omitted fields).
- Registration presence: task types registered, allow-list entries present, routes wired to the feature-flag wrapper.

Integration / e2e:

- API & UI go through **Scout** (`test/scout/api/...`, `node scripts/scout run-tests ...`) — see existing `ai_indices.spec.ts`.
- Never skip/comment out a failing test to make it pass — fix the code.

---

## File & folder layout (canonical)

General plugin structure (the `tasks/` and `{cases,patterns,improvements}/`
entries are the **feedback-loop** example of the pattern; other workstreams add
their own `server/{domain}/` folders the same way):

```
context_engine/
  kibana.jsonc            # requiredPlugins / optionalPlugins (taskManager, workflowsManagement optional)
  tsconfig.json           # kbn_references (NOT @kbn/workflows-management-plugin)
  common/
    constants.ts          # paths, AI_INDEX_API_VERSION, limits
    features.ts           # apiPrivileges (read/writeContextEngine)
    http_api/ai_indices.ts# AI index model (+ self_improvement additions, feedback-loop)
    agent_builder/constants.ts  # agent / tool / attachment ids
  server/
    plugin.ts             # instantiate services in start(); register routes/tasks in setup()
    ai_indices/{storage,service,registry}.ts   # model + patch()
    {domain}/{storage,service}.ts               # one folder per store/service
    #   feedback-loop example: {cases,patterns,improvements}/{storage,service}.ts
    #                          tasks/{transform,classify,case_builder_task,trace_classifier_task,index}.ts
    routes/ai_indices.ts  # versioned + withContextEngineFeatureFlag + privilege
    agent_builder/         # registered from agent_builder_platform, not here
      {agent,tools,attachments,skills}/...
  public/
    plugin.ts             # holds chatOpener; start() returns { registerChatOpener }
    types.ts              # local structural OpenChatOptions / ChatAttachmentInput
    application/
      mount.tsx, use_kibana.ts        # ContextEngineServices threading
      api/*.ts                        # per-workstream data access
      hooks/{query_keys,use_*}.ts     # react-query v4 (isLoading)
      components/ai_index_detail/*.tsx
  test/scout/api/...
```

- New files: `snake_case`. React components/types `PascalCase`, functions/vars `camelCase`.
- Keep server domain code in `server/{domain}/{storage,service}.ts`; keep browser data access in `public/application/{api,hooks,components}` — don't fetch directly inside components.
