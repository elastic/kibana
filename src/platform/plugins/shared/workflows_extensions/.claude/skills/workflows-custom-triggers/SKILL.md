---
name: workflows-custom-triggers
description: Register and implement custom workflow triggers from an external Kibana plugin using `@kbn/workflows-extensions`. Use when adding or modifying an event-driven trigger with `registerTriggerDefinition`, designing `eventSchema` Zod schemas, writing `documentation` and KQL `snippets`, wiring `emitEvent` via request context or `getClient`, choosing sync vs async public loader registration, updating `APPROVED_TRIGGER_DEFINITIONS`, or reviewing PRs that touch any of these. Always ask for the user's plugin id first to locate the correct plugin and file paths.
---

# Workflows — Custom Trigger Registration

> Custom triggers let workflows subscribe to domain events from your plugin. A misconfigured trigger can break workflows on every restart, emit invalid payloads that fail at runtime, cause infinite event chains, or silently fail the approval gate. The defaults are not always right — verify each field below explicitly.

## Overview

A custom workflow trigger is owned and registered by a **plugin other than `workflows_extensions`**. The workflows-team plugin only hosts internal triggers; everything external must live in the owning plugin.

A trigger lives in three layers:

- **Common** — `id`, `eventSchema`, `title`, `description`, optional `documentation` / `snippets`. Imported by both server and public to keep them in sync. All the fields inside eventSchema should have description. This description is later on used for documentation purposes.
- **Server** — registers the **same** common definition via `registerTriggerDefinition`; emits events with `emitEvent`.
- **Public** — spreads the common definition and adds **icon** only (browser-only UI).

Both sides register through the `workflowsExtensions` setup contract:

- Server: `registerTriggerDefinition(commonDefinition)`
- Public: `registerTriggerDefinition(definition | () => Promise<definition>)`

**Source of truth:**

- Contributing guide: `src/platform/plugins/shared/workflows_extensions/dev_docs/TRIGGERS.md`
- Worked example: `examples/workflows_extensions_example/`
- Common base type: `src/platform/plugins/shared/workflows_extensions/common/trigger_registry/types.ts` (`CommonTriggerDefinition`, `TriggerDocumentation`, `TriggerSnippets`)
- Public trigger types: `src/platform/plugins/shared/workflows_extensions/public/trigger_registry/types.ts` (`PublicTriggerDefinition`)
- Emit API: `src/platform/packages/shared/kbn-workflows/server/types.ts` (`WorkflowsClient`, `WorkflowsApiRequestHandlerContext`, `emitEvent`)
- Event-chain guardrails: `src/platform/plugins/shared/workflows_extensions/server/event_chain_context.ts`
- Approval fixture: `src/platform/plugins/shared/workflows_extensions/test/scout/api/fixtures/approved_trigger_definitions.ts`

For longer code templates (full scaffold, nested schemas, loop demo), see [reference.md](reference.md).

## 0. Locate the owning plugin (do this first)

**Before creating or editing any files**, ask the user for their **plugin id** (`plugin.id` from `kibana.jsonc`, camelCase — e.g. `cases`, `workflowsExtensionsExample`). Do not guess or assume a plugin.

If the user already named their plugin in the request, confirm it matches `plugin.id` before proceeding.

### Resolve the plugin root

Find the plugin directory by searching for the id in `kibana.jsonc`:

```bash
rg '"id": "<pluginId>"' --glob '**/kibana.jsonc'
```

The directory containing that `kibana.jsonc` is the **plugin root**. Read it to confirm `plugin.server` / `plugin.browser` and whether `workflowsExtensions` is already in `requiredPlugins`.

### Choose file locations inside the plugin

Inspect the plugin root for existing trigger or workflow extension layout. **Follow conventions already used in that plugin** rather than inventing new paths.

| If the plugin already has… | Add files there |
|---|---|
| `common/workflows/triggers/` (e.g. `cases`) | `common/workflows/triggers/<trigger_name>.ts` |
| `common/triggers/` (e.g. example plugin) | `common/triggers/<trigger_name>.ts` |
| No trigger files yet | Use `common/triggers/<trigger_name>.ts` and mirror under `server/triggers/` and `public/triggers/` |

Also check for existing registration hooks:

- `server/**/triggers/index.ts` or `server/plugin.ts` — server registration
- `public/**/triggers/` or `public/plugin.ts` — public registration

Wire new triggers into those existing index/setup files when present; only create new index files when the plugin has no trigger layout yet.

## File layout

Mirror the layout used by `examples/workflows_extensions_example/` so reviewers and the workflows team can find things:

```
your-plugin/
├── common/triggers/<trigger_name>.ts       # common definition (id + eventSchema + title + description)
├── server/triggers/index.ts                # registerTriggerDefinitions(setup)
├── public/triggers/<trigger_name>.ts       # spread common + icon
└── public/triggers/index.ts                # registerTriggerDefinitions(setup)
```

Keep `id`, `eventSchema`, `title`, `description`, `documentation`, and `snippets` in the **common** file only. Re-importing them on the public side is how server/public stay locked together.

## 1. `id` and naming — namespaced and stable

**Rule:** Trigger IDs MUST follow `<namespace>.<event>` with **kebab-case** namespace and **camelCase** event. Once shipped, the ID is part of users' YAML; renaming it breaks every existing workflow.

```ts
export const MyTriggerId = 'agent-builder.agentCompleted';   // ✓
export const MyTriggerId = 'cases.caseCreated';              // ✓
```

```ts
export const MyTriggerId = 'my_trigger';                     // ✗ no namespace
export const MyTriggerId = 'custom_trigger';                 // ✗ event not camelCase
export const MyTriggerId = 'my_plugin.my_event';             // ✗ snake_case event
```

Namespace conventions:

| Area | Namespace | Notes |
|---|---|---|
| `cases.*` | owned by Cases plugin | Do not add new `cases.*` triggers outside the Cases plugin |
| Your plugin | a fresh kebab-case namespace | Use one prefix per domain (e.g. `agent-builder.*`, `alerting-v2.*`, `workflows-extensions-example.*`) |

Avoid generic names (`trigger`, `event`, `fired`) without a namespace.

## 2. Common definition — what *both* sides need

**Rule:** `title` and `description` are **required** on the common definition. Put them — together with `id`, `eventSchema`, and optional i18n'd `documentation` / `snippets` — in `common/triggers/<trigger>.ts` (or the plugin's existing triggers subdirectory). Do not duplicate them on the public side.

```ts
import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';

export const MyTriggerId = 'my-namespace.myTrigger' as const;

export const myTriggerEventSchema = z.object({
  message: z.string().describe('The message text for the event.'),
  source: z.string().optional().describe('The source that emitted the event.'),
  category: z.string().optional().describe('Category for filtering in workflow conditions.'),
});

export type MyTriggerEvent = z.infer<typeof myTriggerEventSchema>;

export const myTriggerCommonDefinition: CommonTriggerDefinition = {
  id: MyTriggerId,
  eventSchema: myTriggerEventSchema,
  title: i18n.translate('myPlugin.myTrigger.title', { defaultMessage: 'My trigger' }),
  description: i18n.translate('myPlugin.myTrigger.description', {
    defaultMessage: 'Emitted when something happens.',
  }),
  documentation: {
    details: i18n.translate('myPlugin.myTrigger.documentation.details', {
      defaultMessage:
        'Filter when this workflow runs using KQL on event properties (e.g. event.category, event.message).',
    }),
    examples: [
      i18n.translate('myPlugin.myTrigger.documentation.exampleCategory', {
        defaultMessage: `## Match by category
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.category: "alerts"'
\`\`\``,
        values: { triggerId: MyTriggerId },
      }),
    ],
  },
  snippets: { condition: 'event.category: "alerts"' },
};
```

## 3. `eventSchema`, documentation, and snippets

**Rule:** Decide the payload shape before writing emit sites. `eventSchema` is validated at **emit time**; invalid payloads throw. Workflow conditions reference emitted fields as `event.*` in KQL.

| Concern | Rule |
|---|---|
| `eventSchema` | Must be a Zod **object** schema; use `.describe()` on every field |
| Unknown fields | Object schemas reject unknown keys by default — do not loosen unless intentional |
| `documentation.examples[]` | Each example must only reference fields on `eventSchema` (agents pattern-match YAML) |
| `snippets.condition` | Must be valid KQL using only `event.*` fields from `eventSchema`; validated at registration |
| Template syntax in i18n | Values containing `{{ ... }}` or backticks with trigger ids MUST use i18n `values:` |

Payload is available in workflow YAML as `context.event` (and as `event` in trigger `on.condition` KQL).

```yaml
triggers:
  - type: my-namespace.myTrigger
    on:
      condition: 'event.category: "alerts"'
steps:
  - name: handle_event
    type: console.log
    with:
      message: "Event: {{ context.event.message }}"
```

`documentation.details` and `documentation.examples[]` show up in the editor side panel and agent tooling. `snippets.condition` pre-fills the trigger's `on.condition` when users add the trigger from the UI.

## 4. Server registration

**Rule:** Register the **common definition unchanged** on the server during plugin `setup()`. There is no server wrapper helper — the common object *is* the server definition.

```ts
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { myTriggerCommonDefinition } from '../../common/triggers/my_trigger';

export const registerTriggerDefinitions = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
) => {
  workflowsExtensions.registerTriggerDefinition(myTriggerCommonDefinition);
};

// In server plugin setup():
registerTriggerDefinitions(plugins.workflowsExtensions);
```

- Do **not** call `registerTriggerDefinition` from `start()` — registration is a setup-phase operation.
- Server registration does **not** support async loaders (unlike public steps/triggers on the public side).
- Pair every server registration with a public registration for the same `id`.

## 5. Public definition — icon only

**Rule:** Spread the common definition and add **icon** only. The public file should not restate `title`, `description`, or schemas.

```ts
import React from 'react';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import { myTriggerCommonDefinition } from '../../common/triggers/my_trigger';

export const myTriggerPublicDefinition: PublicTriggerDefinition = {
  ...myTriggerCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/star').then(({ icon }) => ({ default: icon }))
  ),
};
```

- **Icon MUST be a React component** (preferably lazy-loaded from `@elastic/eui/es/components/icon/assets/*`). EUI icon name strings (`'star'`) are **not** supported by the workflows editor today — the build will not fail, the icon will simply be missing.

## 6. Emit events — request context vs direct client

**Rule:** Add `workflowsExtensions` to your plugin's `requiredPlugins` in `kibana.jsonc`. Emit only after the trigger is registered on the server. Payload must satisfy `eventSchema`.

### Option A — Request context (recommended for routes)

Type route handler context to include `workflows: WorkflowsApiRequestHandlerContext` from `@kbn/workflows/server`.

```ts
const workflows = await context.workflows;
await workflows.emitEvent(MyTriggerId, {
  message: request.body.message,
  source: 'my-api',
  category: 'alerts',
});
```

- Space and user attribution come from the current request automatically.
- **Always pass the same request** you use for attribution/space so event-chain depth tracking works (see §8).

Reference: `examples/workflows_extensions_example/server/routes/emit_event.ts`

### Option B — Direct client (background jobs with KibanaRequest)

When you have a `KibanaRequest` but not route context:

```ts
const workflowsClient = await plugins.workflowsExtensions.getClient(request);
await workflowsClient.emitEvent(MyTriggerId, {
  message: 'Event from job',
  source: 'background',
  category: 'audit',
});
```

```ts
// Anti-pattern: emit without a real request when depth/cycle guardrails matter
await someGlobalClient.emitEvent(MyTriggerId, payload); // no chain context
```

- Invalid payloads throw at emit time.
- A trigger event handler (registered by `workflows_management`) must be running for workflows to execute.

## 7. Registration — sync vs async loader (public only)

**Rule:** Prefer the **async loader form** on the public side so the trigger module (and its zod deps) are not pulled into the plugin's main bundle. Server registration stays synchronous.

```ts
// public/triggers/index.ts — async loader keeps trigger module out of main bundle
export const registerTriggerDefinitions = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
) => {
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./my_trigger').then((m) => m.myTriggerPublicDefinition)
  );
};
```

- The workflow editor and trigger registry `await workflowsExtensions.isReady()` before reading definitions, so async loaders are settled before the UI renders.
- Loaders that reject are caught and logged; one broken loader does NOT prevent other triggers from registering. Verify the log when a trigger is silently missing.
- Public trigger loaders do **not** support returning `undefined` to skip registration (unlike step loaders). Feature-flag optional triggers by guarding the `registerTriggerDefinition` call itself.

## 8. Event-chain guardrails

**Rule:** When your trigger can fire from workflows that re-emit events, design for loop prevention from the start.

- **Depth limit:** `workflowsExecutionEngine.eventDriven.maxChainDepth` in `kibana.yml` (default `10`, min `1`). Exceeding it stops scheduling further runs and logs a server warning.
- **Same request:** Always pass the **same request** used for attribution/space to `emitEvent` so depth tracking works.
- **`on.workflowEvents` (YAML):** Registered triggers support `ignore`, `avoid-loop` (default), or `allow-all` on workflow-attributed emits.

For a loop demo, use `kibana.request` (not a generic HTTP connector) so event-chain headers propagate. See `examples/workflows_extensions_example` (`example.loopTrigger`) and [TRIGGERS.md § Event-chain depth demo](../../dev_docs/TRIGGERS.md#event-chain-depth-loop-demo).

## 9. The approval gate — `APPROVED_TRIGGER_DEFINITIONS`

**Rule:** Every new trigger (and every change to `eventSchema`) MUST appear in `src/platform/plugins/shared/workflows_extensions/test/scout/api/fixtures/approved_trigger_definitions.ts` before the Scout API approval test will pass. The list stores `{ id, schemaHash }` pairs; the test compares registered triggers against this list.

Workflow:

1. Implement the trigger end-to-end (common + server + public + registration + emit path).
2. Run the approval test locally (or start the server and GET `internal/workflows_extensions/trigger_definitions`):
   ```bash
   node scripts/scout.js run-tests --arch stateful --domain classic \
     --config src/platform/plugins/shared/workflows_extensions/test/scout/api/playwright.config.ts
   ```
3. Copy the printed entry (or `schemaHash` from the GET response) into `APPROVED_TRIGGER_DEFINITIONS` (sorted alphabetically by `id`).
4. Request approval from `@elastic/workflows-eng` in the PR.
5. If you change `eventSchema` later, the hash changes — repeat steps 2–4.

```ts
// approved_trigger_definitions.ts
export const APPROVED_TRIGGER_DEFINITIONS: Array<{ id: string; schemaHash: string }> = [
  // ... existing entries, sorted ...
  { id: 'my-namespace.myTrigger', schemaHash: '<schemaHash from test output>' },
];
```

## Quick rule reference

| Concern | Rule | Default if omitted | When wrong |
|---|---|---|---|
| `id` | `<kebab-namespace>.<camelEvent>`; stable for the life of the workflow | n/a | Renames break user YAML |
| Common file | Holds `id`, `eventSchema`, `title`, `description`, `documentation`, `snippets` | n/a | Drift between server and public |
| `eventSchema` | Zod object; `.describe()` on every field | n/a | Emit throws; bad editor/agent docs |
| `documentation.examples` | Only fields from `eventSchema` | none | Agents generate invalid YAML |
| `snippets.condition` | Valid KQL on `event.*` only | none | Registration fails or bad UX |
| Server registration | Register common definition in `setup()` | n/a | Trigger missing at runtime |
| Public registration | Spread common + `React.lazy` icon | n/a | Missing icon; duplicated strings |
| `emitEvent` | Payload matches `eventSchema`; use real request | n/a | Throws; broken chain guardrails |
| Public loader | Async import to keep zod out of main bundle | sync inline | Trigger module inflates plugin bundle |
| `APPROVED_TRIGGER_DEFINITIONS` | Add new ID + `schemaHash`; sorted by ID | test fails | CI blocks merge until updated |

## Author checklist

When adding a new trigger:

1. **Plugin location**
   - [ ] User's `plugin.id` confirmed; plugin root resolved from `kibana.jsonc`
   - [ ] File paths follow the plugin's existing trigger/workflow layout

2. **Common file** (`common/triggers/<trigger>.ts` or plugin convention)
   - [ ] `id` is namespaced (`<kebab>.<camel>`) and exported as a `const` string
   - [ ] `title`, `description`, and any text in `documentation` use `i18n.translate`
   - [ ] Template syntax / trigger ids inside i18n strings go through `values:`
   - [ ] `eventSchema` declared with `z` from `@kbn/zod/v4`; every field has `.describe()`
   - [ ] `documentation.examples[]` reference only `eventSchema` fields
   - [ ] `snippets.condition` (if present) is valid KQL on `event.*` fields only

3. **Server** (`server/triggers/index.ts` or existing registration hook)
   - [ ] Registers `myTriggerCommonDefinition` unchanged via `registerTriggerDefinition`
   - [ ] Registration happens in `setup()`, never `start()`
   - [ ] Emit sites call `emitEvent` with payloads matching `eventSchema`
   - [ ] Emit uses request context or `getClient(request)` with the attribution request

4. **Public** (`public/triggers/<trigger>.ts`)
   - [ ] Spreads `myTriggerCommonDefinition` — no duplicated `title`/schemas
   - [ ] Icon is a `React.lazy` import from `@elastic/eui/es/components/icon/assets/<name>`
   - [ ] Public registration uses async loader unless the module is trivially small

5. **Plugin wiring**
   - [ ] `workflowsExtensions` in `requiredPlugins` in `kibana.jsonc`
   - [ ] Server and public both register the same trigger `id`

6. **Approval gate**
   - [ ] Scout API test run or GET `internal/workflows_extensions/trigger_definitions` for `schemaHash`
   - [ ] Entry added to `APPROVED_TRIGGER_DEFINITIONS` (alphabetically sorted)
   - [ ] PR description requests review from `@elastic/workflows-eng`

## Reviewer checklist

When reviewing a PR that adds or modifies a custom trigger:

- [ ] No new trigger definitions inside `src/platform/plugins/shared/workflows_extensions/{server,public}/triggers/` — external triggers belong in the owning plugin
- [ ] `title`, `description`, `eventSchema`, `documentation`, `snippets` live in the common file, not duplicated on public
- [ ] `id` follows `<kebab>.<camel>`, has a fresh namespace, and does not collide with another plugin's prefix
- [ ] Every `eventSchema` field has `.describe()`; examples/snippets only use declared fields
- [ ] Server registers the common definition directly in `setup()`; no registration in `start()`
- [ ] Public spreads common definition; icon uses `React.lazy`, not EUI icon name strings
- [ ] `emitEvent` payloads match `eventSchema`; emit path uses the attribution request for chain guardrails
- [ ] Public registration uses an async loader unless the module is trivially small
- [ ] `APPROVED_TRIGGER_DEFINITIONS` is updated (sorted; new entry near related namespace); workflows-eng review requested
- [ ] Event-chain implications considered when workflows can re-emit this trigger

## Reference implementations

| Plugin | Path | Notable pattern |
|---|---|---|
| Workflows example | `examples/workflows_extensions_example/` | Canonical layout; async public loaders; `custom_trigger` docs/snippets; `loop_trigger` + emit route for chain-depth demo |
| Cases | `x-pack/platform/plugins/shared/cases/common/workflows/triggers/` | Multiple triggers in one module; shared base schema; rich i18n documentation examples |
| Cases (public) | `x-pack/platform/plugins/shared/cases/public/workflows/triggers/` | Spread common + lazy icon per trigger |
| Alerting v2 | `x-pack/platform/plugins/shared/alerting_v2/server/lib/workflow_extensions/register_trigger_definitions.ts` | Single registration loop over a catalog shared with runtime emit mapping |

## Additional resources

- Extended templates and loop-demo workflow: [reference.md](reference.md)
- Internal vs external trigger boundary: `src/platform/plugins/shared/workflows_extensions/dev_docs/TRIGGERS.md`
- Public Slack channel for questions: `#one-workflow`
