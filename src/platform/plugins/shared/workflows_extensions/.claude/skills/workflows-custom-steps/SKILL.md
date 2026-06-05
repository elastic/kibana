---
name: workflows-custom-steps
description: Register and implement custom workflow steps from an external Kibana plugin using `@kbn/workflows-extensions`. Use when adding or modifying a step type with `registerStepDefinition`, designing input/output/config Zod schemas, implementing `createServerStepDefinition` / `createPublicStepDefinition`, choosing `StepCategory`, building `editorHandlers` (selection / dynamicSchema), wiring `callKibanaApi` / `onCancel`, deciding sync vs async loader registration, updating `APPROVED_STEP_DEFINITIONS`, or reviewing PRs that touch any of these.
---

# Workflows — Custom Step Registration

> Custom steps run inside the Kibana workflow engine and become part of the YAML the user writes. A misconfigured step can break workflows on every restart, pull heavy modules into the main bundle, leak resources on cancellation, or silently fail the approval gate. The defaults are not always right — verify each field below explicitly.

## Overview

A custom workflow step is owned and registered by a **plugin other than `workflows_extensions`**. The workflows-team plugin only hosts internal steps; everything external must live in the owning plugin.

A step lives in three layers:

- **Common** — `id`, `label`, `description`, `category`, `inputSchema`, `outputSchema`, optional `configSchema` / `documentation` / `stability` / `deprecation`. Imported by both server and public to keep them in sync.
- **Server** — wraps the common definition with a `handler` (and optional `onCancel`) via `createServerStepDefinition`.
- **Public** — wraps the common definition with an `icon` and optional `editorHandlers` via `createPublicStepDefinition`.

Both sides register through the `workflowsExtensions` setup contract: `registerStepDefinition(definition | () => Promise<definition | undefined>)`.

**Source of truth:**

- Contributing guide: `src/platform/plugins/shared/workflows_extensions/dev_docs/STEPS.md`
- Worked example: `examples/workflows_extensions_example/`
- Common base type: `src/platform/packages/shared/kbn-workflows/spec/step_definition_types.ts` (`BaseStepDefinition`, `StepCategory`, `StabilityLevel`, `StepDocumentation`)
- Editor handler types: `src/platform/packages/shared/kbn-workflows/types/v1.ts` (`EditorHandlers`, `StepPropertyHandler`, `PropertySelectionHandler`, `ConnectorIdSelectionHandler`, `DynamicSchema`)
- Reusable index selection handler: `src/platform/packages/shared/kbn-workflows-ui/src/lib/steps/editor_handlers/index_selection_handler.ts` (`getIndexSelectionHandler`, `IndexSelectionHandlerServices`, `IndexSelectionHandlerOptions`)
- Server step types: `src/platform/plugins/shared/workflows_extensions/server/step_registry/types.ts` (`ServerStepDefinition`, `StepHandler`, `StepHandlerContext`, `ContextManager`, `CallKibanaApiParams`, `OnCancelHandler`)
- Public step types: `src/platform/plugins/shared/workflows_extensions/public/step_registry/types.ts` (`PublicStepDefinition`)
- `ExecutionError`: `src/platform/packages/shared/kbn-workflows/server/errors/execution_error.ts`
- Approval fixture: `src/platform/plugins/shared/workflows_extensions/test/scout/api/fixtures/approved_step_definitions.ts`

For longer code templates (selection handlers, dynamic schema, scaffolded files), see [reference.md](reference.md).

## File layout

Mirror the layout used by `examples/workflows_extensions_example/` so reviewers and the workflows team can find things:

```
your-plugin/
├── common/step_types/<step_name>.ts        # common definition (id + schemas + label + category)
├── server/step_types/<step_name>.ts        # createServerStepDefinition + handler
├── server/step_types/index.ts              # registerStepDefinitions(setup)
├── public/step_types/<step_name>.ts        # createPublicStepDefinition + icon + editorHandlers
└── public/step_types/index.ts              # registerStepDefinitions(setup, deps)
```

Keep `id`, `inputSchema`, `outputSchema`, `configSchema` in the **common** file only. Re-importing them on both sides is how server/public stay locked together.

## 1. `id` and naming — namespaced and stable

**Rule:** Step IDs MUST follow `<namespace>.<action>` with **kebab-case** namespace and **camelCase** action. Once shipped, the ID is part of users' YAML; renaming it breaks every existing workflow.

```ts
export const MyStepTypeId = 'agent-builder.runAgent';   // ✓
export const MyStepTypeId = 'one-chat.invokeChat';      // ✓
```

```ts
export const MyStepTypeId = 'myStep';                   // ✗ no namespace
export const MyStepTypeId = 'agent_builder.run_agent';  // ✗ snake_case
export const MyStepTypeId = 'elasticsearch.foo';        // ✗ reserved by internal generation
```

Namespace conventions for adjacent areas:

| Area | Namespace | Notes |
|---|---|---|
| `ai`, `data`, `flowControl`, `external`, `elasticsearch`, `kibana`, `kibana.cases` | reserved | Internal/categorized; do not invent new step IDs here without workflows-eng approval |
| Your plugin | a fresh kebab-case namespace | Use one prefix per domain (e.g. `agent-builder.*`, `cases.*`, `security-solution.*`) |

Avoid generic names (`step`, `run`, `invoke`) without a namespace; avoid reserved internal prefixes like `elasticsearch.` (special-cased by the auto-generated step path).

## 2. Common definition — what *both* sides need

**Rule:** `label`, `description`, and `category` are **required** on the common definition (they come from `BaseStepDefinition`). Put them — together with `id`, `inputSchema`, `outputSchema`, optional `configSchema`, and i18n'd `documentation` — in `common/step_types/<step>.ts`. Do not duplicate them on the server or public side.

```ts
import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';

export const MyStepTypeId = 'my-namespace.processMessage' as const;

const InputSchema = z.object({
  message: z.string(),
  count: z.number().int().positive().optional(),
});

const OutputSchema = z.object({ result: z.string() });

const ConfigSchema = z.object({
  'connector-id': z.string(),  // kebab-case for workflow-owned config keys
});

export const myStepCommonDefinition: CommonStepDefinition<
  typeof InputSchema,
  typeof OutputSchema,
  typeof ConfigSchema
> = {
  id: MyStepTypeId,
  category: StepCategory.Kibana,           // controls actions-menu grouping
  label: i18n.translate('myPlugin.myStep.label', { defaultMessage: 'Process Message' }),
  description: i18n.translate('myPlugin.myStep.description', {
    defaultMessage: 'Processes a message and returns a result.',
  }),
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
  documentation: {
    details: i18n.translate('myPlugin.myStep.documentation.details', {
      defaultMessage: 'Use {ref} to consume the result in later steps.',
      values: { ref: '`{{ steps.<name>.output.result }}`' },
    }),
    examples: [/* YAML snippets, see reference.md */],
  },
};
```

`StepCategory` values: `Elasticsearch`, `External`, `Ai`, `Kibana`, `KibanaCases`, `Data`, `FlowControl`. Pick the category that matches where users expect to find the step in the actions menu — not the implementation language. (Some older docs call this `actionsMenuCatalog` / `StepMenuCatalog`; the live enum is `StepCategory` from `@kbn/workflows`.)

`documentation.details` and `documentation.examples[]` show up in the editor side panel; values containing template syntax (`{{ ... }}`) MUST be passed through i18n `values:` so the i18n linter does not interpret them as variables.

## 3. `category` and `config` vs `input` — the mental model

**Rule:** Decide before writing the schemas. `config` (step-level, outside `with:`) controls **how/when/who** the step runs; `input` (inside `with:`) carries **what/where** it processes. Mixing them produces awkward YAML and bad selection UX.

| In your step | Use `configSchema` for | Use `inputSchema` for |
|---|---|---|
| Examples | `connector-id`, `agent-id`, `mode`, `timeout`, `strategy` | `index`, `channel`, `document`, `message`, `query`, `severity` |
| YAML position | Step level keys | Nested under `with:` |
| Naming convention | **kebab-case** (we own the schema) | **kebab-case** or **snake_case** preferred; inherited OpenAPI/connector shapes allowed |

Config keys also unlock built-in step-level features (`if`, `foreach`, `on-failure`, `timeout`) for free — those are reserved keys the engine already understands; do not redefine them in `configSchema`.

## 4. Server handler — `createServerStepDefinition`

**Rule:** Always use `createServerStepDefinition({ ...common, handler, onCancel? })` so input/output/config types are inferred from the common schemas. Never restate types you already declared.

```ts
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { myStepCommonDefinition } from '../../common/step_types/my_step';

export const myStepDefinition = createServerStepDefinition({
  ...myStepCommonDefinition,
  handler: async (context) => {
    const { message, count } = context.input;          // typed from InputSchema
    const { 'connector-id': connectorId } = context.config; // typed from ConfigSchema
    context.logger.info('Processing step', { stepId: context.stepId });

    const result = `Processed: ${message}${count ? ` (count: ${count})` : ''}`;
    return { output: { result } };
  },
});
```

`StepHandlerContext` exposes:

- `input` (validated, typed) / `rawInput` (pre-template) / `config` (validated)
- `contextManager.getContext()` — full `StepContext`
- `contextManager.getScopedEsClient()` — request-scoped ES client
- `contextManager.renderInputTemplate(value)` — evaluate `{{ ... }}` against the workflow context
- `contextManager.getFakeRequest()` — `KibanaRequest` for plugin clients that need one
- `contextManager.callKibanaApi(params)` — see §5
- `logger`, `abortSignal`, `stepId`, `stepType`

When you have a **request-scoped client** from another plugin (`alerting.getRulesClientWithRequest`, `cases.getCasesClientWithRequest`, etc.), pass `context.contextManager.getFakeRequest()` to it — that is the typed, in-process path and skips HTTP entirely.

## 5. `callKibanaApi` — when there is no client

**Rule:** Use `context.contextManager.callKibanaApi(params)` only when the target plugin does not expose a request-scoped client. Treat the return shape as the stable contract; do not rely on the underlying transport (`fetch` today, in-process tomorrow).

```ts
const { status, body } = await context.contextManager.callKibanaApi<{ id: string }>({
  method: 'POST',
  path: '/api/cases',                // space prefix is added automatically
  body: { title: context.input.title, owner: 'cases' },
});
```

- Non-2xx (except 304) → throws `Error('HTTP <status>: <body>')`. Wrap with `ExecutionError` if you want a typed error category (§7).
- `body` is parsed JSON for JSON content types, `string` for non-JSON text, `Buffer` for binary, `{}` for 204/304.
- `Authorization`, `Content-Type`, `kbn-xsrf`, `x-elastic-internal-origin`, event-chain headers are managed by the engine — caller `headers` cannot override them.
- **Not supported:** multipart / `form_data`, streaming/SSE, custom TLS or fetcher options. For those use the `kibana.request` YAML step instead.

```ts
// Anti-pattern: hand-rolling fetch + auth instead of using callKibanaApi or a real client
await fetch('http://localhost:5601/api/cases', {
  headers: { Authorization: '...' /* never works; engine owns auth */ },
});
```

## 6. `abortSignal` and `onCancel` — release everything you take

**Rule:** Propagate `context.abortSignal` to every cancellable operation: ES queries, `fetch`/HTTP, child loops, polling. Add `onCancel` only when the step holds resources that the signal alone does not release.

```ts
const result = await esClient.search({ index, query }, { signal: context.abortSignal });
await fetch(url, { signal: context.abortSignal });
for (const item of items) {
  if (context.abortSignal.aborted) return { output: { partial: true } };
  await processItem(item, context.abortSignal);
}
```

`onCancel` is invoked **after** `abortSignal` fires and `run()` resolves — never in parallel with the handler. Steps that complete normally skip it. Use it for external work the engine cannot see (spawned background jobs, external subscriptions). **Must be idempotent**; thrown errors are logged but never disrupt cancellation.

```ts
export const myStepDefinition = createServerStepDefinition({
  ...myStepCommonDefinition,
  handler: async (context) => {/* ... */},
  onCancel: async (context) => {
    await cancelSpawnedOperations(context);   // idempotent
  },
});
```

```ts
// Anti-pattern: ignore abortSignal, then add an empty onCancel "to be safe"
handler: async (context) => {
  for (const id of bigList) await esClient.search({ index, query: { term: { id } } }); // no signal
},
onCancel: async () => {},  // does nothing; the work keeps running past the timeout
```

## 7. Errors — `ExecutionError` only when you need a type or details

**Rule:** Plain `throw new Error(...)` and `return { error }` are auto-converted to `ExecutionError` (with `type = Error.name`, `message`, no `details`). Use `new ExecutionError({ type, message, details })` only when you need a custom `type` category or structured `details` to make a failure debuggable.

```ts
import { ExecutionError } from '@kbn/workflows/server';

if (!context.input.userId) {
  throw new ExecutionError({
    type: 'ValidationError',
    message: 'User ID is required',
    details: { field: 'userId' },
  });
}
```

- Use `throw` for validation errors at the top of the handler; use `return { error }` when you have already computed a partial state you want to preserve.
- Pick **specific** `type` values (`ValidationError`, `PermissionError`, `NetworkError`) — never `'Error'`.
- Wrap caught errors with context only when you can add structured `details` the original error did not have; otherwise let the engine convert it.

## 8. Public definition — `createPublicStepDefinition`

**Rule:** Always use `createPublicStepDefinition({ ...common, icon?, editorHandlers? })`. The common definition already supplies `label`, `description`, `documentation`, `category`. The public file should only add **UI-only concerns**: icon, selection handlers, dynamic schema.

```ts
import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { myStepCommonDefinition } from '../../common/step_types/my_step';

export const myStepDefinition = createPublicStepDefinition({
  ...myStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/star').then(({ icon }) => ({ default: icon }))
  ),
});
```

- **Icon MUST be a React component** (preferably lazy-loaded from `@elastic/eui/es/components/icon/assets/*`). EUI icon name strings (`'star'`) are **not** supported by the workflows editor today — the build will not fail, the icon will simply be missing.
- For dependency-injected definitions (the public side needs a plugin service), export a **factory**: `export const getMyStepDefinition = (deps) => createPublicStepDefinition({ ... })`.
- `editorHandlers` is optional and only worth adding if your step has properties users select from a catalog (proxies, agents, connectors, indices, owners…). See §9.

## 9. `editorHandlers` — selection & dynamic schema

**Rule:** Property handlers go on `editorHandlers.config[<dot.path>]` (step-level) or `editorHandlers.input[<dot.path>]` (under `with:`). The dot path MUST match the schema you declared in `configSchema` / `inputSchema`. Pick the **least custom** option that works:

1. `connectorIdSelection` — built-in, for picking a Kibana connector by ID. Only works on `config['connector-id']`.
2. `getIndexSelectionHandler` — reusable selection handler from `@kbn/workflows-ui` for picking ES indices / aliases / data streams. Attachable to any field.
3. Custom `selection` (`search` + `resolve` + `getDetails`) — for anything else (templates, agents, owners, custom catalogs).

Do not roll your own connector-id or index picker — the built-ins handle creation links, kind detection, wildcard rules, and validation messaging in a way the editor recognises.

### Custom `selection`

All three functions (`search`, `resolve`, `getDetails`) are required when you declare a `selection`.

```ts
editorHandlers: {
  input: {
    case_template_id: {
      selection: {
        dependsOnValues: ['input.owner'],         // declare every sibling field you read
        search: async (input, context) => {/* return SelectionOption[] */},
        resolve: async (value, context) => {/* SelectionOption | null */},
        getDetails: async (value, context, option) => {/* SelectionDetails */},
      },
    },
  },
}
```

- `search` runs on keystroke; keep it fast. Returned options are cached under `(stepType, scope, key, dependsOnValues-fingerprint)` until replaced.
- `resolve` only runs when validation cannot find the value in the cached search results. Same cache key as `search`.
- `getDetails` runs alongside `resolve` during validation; the combined outcome is cached for **~30s** per logical field. **Implement `getDetails` without extra network calls when `option` is present** — use `option.label`/`option.value`/`context.values`; only fetch when `option === null` (e.g. explaining a stale/pasted ID).
- `dependsOnValues` (`config.foo.bar` / `input.x` dot paths) **must list every sibling field your handlers read** from `context.values`. Missing entries cause stale cache hits when the user edits the sibling.

### Built-in `connectorIdSelection`

For steps that target a Kibana connector. The editor handles autocomplete, "create connector" link, and validation against allowed action types.

```ts
editorHandlers: {
  config: {
    'connector-id': {
      connectorIdSelection: {
        connectorTypes: ['inference.unified_completion', 'bedrock', 'gen-ai', 'gemini'],
        enableCreation: false,            // default for custom steps; first type is used when true
      },
    },
  },
}
```

- `connectorTypes` (required): action type IDs the picker accepts.
- `enableCreation` (optional, default `false` for custom steps): when `true`, the editor shows a "create connector" affordance for the **first entry** in `connectorTypes`.
- **Hard limitations** — verified in `workflows_management/public/shared/lib/connectors_utils.ts`:
  - Only recognised on **`config['connector-id']`**. Renaming the key (e.g. `connectorId`, `connector_id`, `my-connector-id`) silently disables the picker.
  - Only recognised under **`config`**, not `input`.
- `connectorIdSelection` and `selection` live side by side on the same `StepPropertyHandler`; use one or the other, not both.

### Reusable `getIndexSelectionHandler`

For steps with an index / alias / data-stream property. Imported from `@kbn/workflows-ui` and wired into the **`selection`** slot — it returns a fully-formed `PropertySelectionHandler<string>`.

```ts
import { getIndexSelectionHandler } from '@kbn/workflows-ui';

// In a public-side factory that already has Kibana services:
const indexSelection = getIndexSelectionHandler(
  { dataViews: deps.dataViews, application: deps.application },
  { allowWildcard: true, showAllIndices: false, maxResults: 20 }
);

editorHandlers: {
  input: {
    index: { selection: indexSelection },     // works on any field, config or input
  },
}
```

- **Required services** (passed when constructing the handler): `dataViews` (`@kbn/data-views-plugin/public` — `DataViewsContract`), `application` (`@kbn/core/public` — `ApplicationStart`). You must inject these via a public-side factory; static `createPublicStepDefinition` calls cannot get them.
- **Options** (all optional): `maxResults` (default `20`), `allowWildcard` (default `false`), `showAllIndices` (default `false` — hidden/internal indices excluded).
- **No field-name restriction**: attach to any config or input property whose value is an index pattern (`index`, `target`, `data_stream`, etc.).
- The handler emits user-friendly metadata (`Type: index | alias | data stream`, wildcard match counts) and an "Open Index Management" link when no match is found.

### Dynamic output schema

For schemas where the output shape depends on the input, use `editorHandlers.dynamicSchema.getOutputSchema({ input, config })`. The editor re-evaluates it for autocomplete; the **server still validates against the static `outputSchema`** in the common definition, so keep that schema as the union of all possible shapes.

Worked end-to-end examples (custom `selection`, `connectorIdSelection`, `getIndexSelectionHandler`, `dynamicSchema`) live in [reference.md](reference.md).

## 10. Registration — sync vs async loader

**Rule:** Prefer the **async loader form** on the public side so the step module (and its zod deps) are not pulled into the plugin's main bundle. Use sync registration only when the definition has no heavy imports. Use a loader returning `undefined` for conditional/feature-flagged registration on either side.

```ts
// public/step_types/index.ts — async loader keeps step module out of main bundle
export const registerStepDefinitions = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup,
  deps: RegisterStepDefinitionsDependencies
) => {
  workflowsExtensions.registerStepDefinition(() =>
    import('./my_step').then((m) => m.getMyStepDefinition(deps))
  );

  workflowsExtensions.registerStepDefinition(async () => {
    if (!(await deps.featureFlags.get('my-step-enabled'))) return undefined;  // skips silently
    return (await import('./my_optional_step')).myOptionalStepDefinition;
  });
};
```

```ts
// server/step_types/index.ts — sync is fine on the server; use a loader for feature flags
export const registerStepDefinitions = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup,
  core: CoreSetup,
) => {
  workflowsExtensions.registerStepDefinition(myStepDefinition);
  workflowsExtensions.registerStepDefinition(async () => {
    const [coreStart] = await core.getStartServices();
    if (!coreStart.featureFlags.getBooleanValue('my-step-flag', false)) return undefined;
    return myOptionalStepDefinition;
  });
};
```

- Both setup contracts also let you register triggers and managed workflows; do **not** call `registerStepDefinition` from `start()` — registration is a setup-phase operation.
- Loaders that reject (or throw inside the registry) are caught and logged via the plugin logger; one broken loader does NOT prevent other steps from registering. Verify the log when a step is silently missing.
- The workflow execution engine and the workflows UI both `await workflowsExtensions.isReady()` before reading the registry, so async loaders are guaranteed to have settled by the time a workflow runs or the editor renders. Call `isReady()` yourself only if you read the registry from another entry point.

## 11. The approval gate — `APPROVED_STEP_DEFINITIONS`

**Rule:** Every new step (and every meaningful change to an existing handler) MUST appear in `src/platform/plugins/shared/workflows_extensions/test/scout/api/fixtures/approved_step_definitions.ts` before the Scout API approval test will pass. The list stores `{ id, handlerHash }` pairs; the test SHA256s your handler implementation and compares.

Workflow:

1. Implement the step end-to-end (common + server + public + registration).
2. Run the approval test locally to surface the new ID + hash:
   ```bash
   node scripts/scout.js run-tests --arch stateful --domain classic \
     --config src/platform/plugins/shared/workflows_extensions/test/scout/api/playwright.config.ts
   ```
3. Copy the printed entry into `APPROVED_STEP_DEFINITIONS` (sorted alphabetically by `id`).
4. Request approval from `@elastic/workflows-eng` in the PR.
5. If you change the handler implementation later, the hash will change — repeat steps 2–4.

```ts
// approved_step_definitions.ts
export const APPROVED_STEP_DEFINITIONS: Array<{ id: string; handlerHash: string }> = [
  // ... existing entries, sorted ...
  { id: 'my-namespace.processMessage', handlerHash: '<sha256 from test output>' },
];
```

## Quick rule reference

| Concern | Rule | Default if omitted | When wrong |
|---|---|---|---|
| `id` | `<kebab-namespace>.<camelAction>`; stable for the life of the workflow | n/a | Renames break user YAML; reserved prefixes (`elasticsearch.`) collide with internals |
| Common file | Holds `id`, schemas, `label`, `description`, `category`, `documentation` | n/a | Drift between server and public side |
| `category` | Pick the menu group users will look in | n/a | Step hides in the wrong actions-menu section |
| `configSchema` vs `inputSchema` | Config controls behavior; input carries payload | n/a | Awkward YAML; selection UX confused about what to autocomplete |
| `createServerStepDefinition` | Use it (don't hand-annotate types) | n/a | Loss of input/output type inference, drift |
| `abortSignal` | Pass to ES, HTTP, loops | n/a | Step runs past cancellation; blocks shutdown |
| `onCancel` | Implement only when the step holds resources beyond the signal | none | Leaks; or empty stub gives false confidence |
| `ExecutionError` | Use when you need a custom `type` or `details` | auto-conversion of raw errors | Useless `'Error'` type; lost debugging context |
| `callKibanaApi` | Use only when no request-scoped client exists | n/a | Re-invents auth; brittle on transport change |
| Icon | `React.lazy` from `@elastic/eui/es/components/icon/assets/*` | none | Missing icon in editor; bundles all EUI icons |
| Connector picker | Use `connectorIdSelection` on `config['connector-id']` | none | Hand-rolled selection misses the "create connector" link and type filtering |
| Index picker | Use `getIndexSelectionHandler({ dataViews, application }, options)` from `@kbn/workflows-ui` in the `selection` slot | none | Hand-rolled handler misses wildcard/alias/data-stream semantics |
| `editorHandlers.selection.dependsOnValues` | List every sibling field your handlers read | `{ config: {}, input: {} }` | Stale cache hits on sibling edits |
| `editorHandlers.selection.getDetails` | Avoid network calls when `option` is present | n/a | Slow hovers; redundant fetches |
| Public registration | Async loader to keep modules out of main bundle | sync inline | Step module + zod inflate plugin bundle |
| Conditional registration | Loader returns `undefined` to skip | always registers | Cannot feature-flag |
| `APPROVED_STEP_DEFINITIONS` | Add new ID + hash; sorted by ID | test fails | CI blocks merge until updated |

## Author checklist

When adding a new step:

1. **Common file** (`common/step_types/<step>.ts`)
   - [ ] `id` is namespaced (`<kebab>.<camel>`) and exported as a `const` string
   - [ ] `category` matches the actions-menu group users expect
   - [ ] `label`, `description`, and any text in `documentation` use `i18n.translate`
   - [ ] Template syntax (`{{ ... }}`) inside i18n strings goes through `values:`
   - [ ] `inputSchema` / `outputSchema` declared with `z` from `@kbn/zod/v4`
   - [ ] `configSchema` declared **only** for behavior-controlling step-level properties; no reserved keys (`if`, `foreach`, `on-failure`, `timeout`)
   - [ ] Workflow-owned config keys are kebab-case; inherited keys (OpenAPI/connector) keep their original shape

2. **Server file** (`server/step_types/<step>.ts`)
   - [ ] Uses `createServerStepDefinition` (no explicit `ServerStepDefinition` annotation)
   - [ ] Spreads `myStepCommonDefinition` — no duplicated `label`/`category`/schemas
   - [ ] `context.abortSignal` is passed to every ES query, `fetch`, and tight loop
   - [ ] Uses `context.contextManager.getFakeRequest()` with a real plugin client when available, falls back to `callKibanaApi` only otherwise
   - [ ] Errors with custom categories or structured detail use `ExecutionError`; raw errors are fine for everything else
   - [ ] `onCancel` is implemented only if the step allocates resources outside the signal's reach, and is idempotent

3. **Public file** (`public/step_types/<step>.ts`)
   - [ ] Uses `createPublicStepDefinition`
   - [ ] Spreads `myStepCommonDefinition`
   - [ ] Icon is a `React.lazy` import from `@elastic/eui/es/components/icon/assets/<name>`
   - [ ] If the step picks a Kibana connector, the property is `config['connector-id']` and uses `connectorIdSelection` with an explicit `connectorTypes` (and `enableCreation` only when intentional)
   - [ ] If the step picks an index / alias / data stream, the property uses `selection: getIndexSelectionHandler(services, options)` from `@kbn/workflows-ui`, with `dataViews` and `application` injected via a public-side factory
   - [ ] For other catalogs, `editorHandlers` provides full `selection: { search, resolve, getDetails }` per dot path
   - [ ] Every sibling property read inside the handlers is listed in `dependsOnValues`
   - [ ] `getDetails` does not make a network call when `option` is non-null
   - [ ] Dynamic output shape (if any) is expressed via `editorHandlers.dynamicSchema.getOutputSchema`, **not** by varying `outputSchema`

4. **Registration** (`{server,public}/step_types/index.ts`)
   - [ ] Public side uses async loader (`() => import('./...').then(...)`) to keep zod + step module out of the main bundle
   - [ ] Conditional/feature-flagged steps return `undefined` from the loader; they do not throw
   - [ ] All `registerStepDefinition` calls happen in `setup()`, never `start()`
   - [ ] Plugin's `kibana.jsonc` declares `workflowsExtensions` in `requiredPlugins`

5. **Approval gate**
   - [ ] Local Scout API test was run; it printed the new ID + handler hash
   - [ ] Entry added to `APPROVED_STEP_DEFINITIONS` (alphabetically sorted)
   - [ ] PR description requests review from `@elastic/workflows-eng`

## Reviewer checklist

When reviewing a PR that adds or modifies a custom step:

- [ ] No new top-level files inside `src/platform/plugins/shared/workflows_extensions/{server,public}/steps/` — external steps belong in the owning plugin
- [ ] `label`, `description`, `category`, `schemas` live in the common file, not duplicated on server/public
- [ ] `id` follows `<kebab>.<camel>`, has a fresh namespace, and is not in a reserved prefix
- [ ] Server handler uses `createServerStepDefinition`; types are inferred, not restated
- [ ] `abortSignal` flows through every ES/HTTP call in the diff — search for new `esClient.search(` / `fetch(` without a `signal:`
- [ ] If `callKibanaApi` is used, check whether a request-scoped client from the target plugin would work instead
- [ ] Errors thrown inside the handler are either intentional plain errors or `ExecutionError` with a specific `type`
- [ ] Public file uses `React.lazy` for the icon; no inline `<EuiIcon type="..." />` references
- [ ] If a connector ID is in scope, the property is `config['connector-id']` and uses `connectorIdSelection` with explicit `connectorTypes` — not hand-rolled `selection`
- [ ] If an index / alias / data stream is in scope, the property uses `selection: getIndexSelectionHandler(...)` from `@kbn/workflows-ui` — not hand-rolled `selection`
- [ ] `editorHandlers.selection.dependsOnValues` covers every sibling field referenced inside `search` / `resolve` / `getDetails`
- [ ] `getDetails` does not call the network when `option` is present
- [ ] Public registration uses an async loader unless the step module is trivially small
- [ ] Conditional registration paths return `undefined`, not `null` or a rejected promise
- [ ] `APPROVED_STEP_DEFINITIONS` is updated (sorted; new entry near related namespace); workflows-eng review requested
- [ ] No `registerStepDefinition` call moved into `start()`

## Reference implementations

| Plugin | Path | Notable pattern |
|---|---|---|
| Workflows example | `examples/workflows_extensions_example/` | Canonical layout; both sync and async loader; `editorHandlers.selection` with `dependsOnValues` |
| Agent Builder | `x-pack/platform/plugins/shared/agent_builder/public/step_types/run_agent_step.ts` | `connectorIdSelection` with restricted `connectorTypes` and `enableCreation: false`; `dynamicSchema.getOutputSchema` extending the base schema |
| Cases | `x-pack/platform/plugins/shared/cases/public/workflows/create_case_from_template.tsx` | Custom `input` `selection` with `dependsOnValues: ['input.owner']`; uses domain helpers (`collectSelectionSearchOptions`, `isValidOwner`) |
| Cases (server) | `x-pack/platform/plugins/shared/cases/server/workflows/` | Many handlers built from a factory `(getCasesClient) => createServerStepDefinition(...)` — use the typed `CasesClient`, not `callKibanaApi` |
| Internal index steps | `src/platform/plugins/shared/workflows_management/public/common/context/internal_steps/editor_handlers/editor_handlers.ts` | `getIndexSelectionHandler` constructed with different `allowWildcard` / `showAllIndices` per use case (search vs write vs delete) |
| Security Solution | `x-pack/solutions/security/plugins/security_solution/{server,public}/workflows/step_types/` | Async loader gated on a feature flag resolved from `core.getStartServices().featureFlags` |
| Alerting v2 | `x-pack/platform/plugins/shared/alerting_v2/server/lib/workflow_extensions/register_step_definitions.ts` | Multiple step definitions registered from a single plugin |

## Additional resources

- Extended templates and selection/dynamic-schema examples: [reference.md](reference.md)
- Internal vs external step boundary: `src/platform/plugins/shared/workflows_extensions/dev_docs/STEPS.md`
- Public Slack channel for questions: `#one-workflow`
