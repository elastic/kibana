---
name: workflows-managed-workflows
description: Register and roll out managed workflows from a Kibana plugin using `@kbn/workflows-extensions` and `@kbn/workflows/managed`. Use when adding or modifying a code-owned workflow definition, `registerManagedWorkflowOwner`, `initManagedWorkflowsClient`, `install` / `uninstall` / `ready`, choosing `lifecycle` / `versionStrategy` / `enablement`, authoring `yaml` vs `yamlTemplate`, space-scoped vs global installs, `getWorkflowStatus`, or `execute`, or reviewing PRs that touch managed workflow definitions or rollout. Always ask for the user's plugin id first to locate the correct plugin and definition file paths.
---

# Workflows — Managed Workflow Registration

> Managed workflows are code-owned workflow documents the platform installs and reconciles for you. A misconfigured definition can orphan documents at startup, wipe dynamic instances, install into the wrong space, or ship YAML that fails validation. The defaults are not always right — verify each field below explicitly.

## Overview

A **managed workflow** is a workflow document owned by platform code, not by users. The owning plugin declares the definition, registers ownership, and calls `install` / `execute`; the platform persists documents, reconciles upgrades, and cleans up orphans.

Managed workflows span two locations:

- **Definition** — `ManagedWorkflowDefinition` in `@kbn/workflows/managed` (`id`, `pluginId`, `version`, `yaml` or `yamlTemplate`, `management`). Registered in `managedWorkflowDefinitions`.
- **Owner plugin** — registers `pluginId` in `setup()`, initializes a plugin-scoped client in `start()`, then `install` / `uninstall` / `ready` / `getWorkflowStatus` / `execute`.

There is **no public-side registration**. Users interact with installed documents through the normal Workflows UI (with managed rules: badge, delete blocked).

**Source of truth:**

- Contributing guide: `src/platform/plugins/shared/workflows_extensions/dev_docs/MANAGED_WORKFLOWS.md`
- Worked example: `examples/workflows_extensions_example/` + `src/platform/packages/shared/kbn-workflows/managed/definitions/workflows_extensions_example.ts`
- Definition types: `src/platform/packages/shared/kbn-workflows/managed/types.ts` (`ManagedWorkflowDefinition`, `ManagedWorkflowManagement`)
- Registry: `src/platform/packages/shared/kbn-workflows/managed/definitions/index.ts` (`managedWorkflowDefinitions`)
- Plugin-scoped client: `src/platform/plugins/shared/workflows_extensions/server/types.ts` (`initManagedWorkflowsClient`, `PluginScopedManagedWorkflowsApi`)
- Runtime API types: `src/platform/packages/shared/kbn-workflows/server/types.ts` (`ManagedWorkflowInstallOptions`, `ExecuteManagedWorkflowOptions`, `ManagedWorkflowStatusReport`)
- Global space constant: `GLOBAL_WORKFLOW_SPACE_ID` from `@kbn/workflows/server`
- Registry tests: `src/platform/packages/shared/kbn-workflows/managed/managed_workflow_definitions.test.ts`

For longer code templates (full scaffold, streams pattern, dynamic install, execute), see [reference.md](reference.md).

## 0. Locate the owning plugin (do this first)

**Before creating or editing any files**, ask the user for their **plugin id** (`plugin.id` from `kibana.jsonc`, camelCase — e.g. `streams`, `workflowsExtensionsExample`). Do not guess or assume a plugin.

If the user already named their plugin in the request, confirm it matches `plugin.id` before proceeding. The same id must appear on:

- `definition.pluginId` in `@kbn/workflows/managed`
- `registerManagedWorkflowOwner(pluginId)` in plugin `setup()`
- `initManagedWorkflowsClient(pluginId)` in plugin `start()`

### Resolve the plugin root

```bash
rg '"id": "<pluginId>"' --glob '**/kibana.jsonc'
```

Read that `kibana.jsonc` to confirm `workflowsExtensions` is in `requiredPlugins`.

### Choose file locations

| Location | Purpose |
|---|---|
| `src/platform/packages/shared/kbn-workflows/managed/definitions/<plugin>.ts` | Definition + exported id const(s) |
| `src/platform/packages/shared/kbn-workflows/managed/definitions/index.ts` | Add to `managedWorkflowDefinitions`; re-export id(s) |
| `your-plugin/server/managed_workflows/` | Optional: re-export ids + `PLUGIN_ID` const for install code |
| `your-plugin/server/plugin.ts` | `registerManagedWorkflowOwner` (setup), client + installs (start) |

Inspect existing plugins for conventions already in use (flat file vs subdirectory, e.g. `streams_ki/`, `sig_events/`).

## File layout

```
@kbn/workflows/managed/
├── definitions/<your_plugin>.ts          # id const + ManagedWorkflowDefinition(s)
└── definitions/index.ts                  # managedWorkflowDefinitions + re-exports

your-plugin/
├── server/managed_workflows/index.ts     # optional: re-export ids, PLUGIN_ID const
└── server/plugin.ts                      # owner registration + install/ready/execute
```

Keep workflow YAML in the definition file (`yaml` string) or import from a sibling `.yaml` file (see Streams). Never hardcode `'system-...'` literals at install/execute call sites — always import the id const from `@kbn/workflows/managed`.

## 1. `id` and naming — `system-` prefix, stable forever

**Rule:** Managed definition ids **must** start with `system-`. The platform rejects this prefix for user-defined workflows, so managed ids never collide with user YAML. Once shipped, the id is persisted in `.workflows-*` indices; renaming breaks installed documents.

```ts
export const MY_WORKFLOW_ID = 'system-my-plugin-onboarding';   // ✓
export const STREAMS_KI_ONBOARDING_WORKFLOW_ID = 'system-streams-ki-onboarding'; // ✓
```

```ts
export const MY_WORKFLOW_ID = 'my-plugin-onboarding';         // ✗ missing system- prefix
export const MY_WORKFLOW_ID = 'system_my_plugin_onboarding';   // ✗ use kebab-case after system-
```

Pick ids that encode the owning domain after `system-` (e.g. `system-streams-ki-onboarding`, `system-example-greeting`).

## 2. Author the definition — `@kbn/workflows/managed`

**Rule:** Every managed definition requires `id`, `pluginId`, `version`, exactly one of `yaml` / `yamlTemplate`, and an explicit `management` policy. There is no runtime default for `management`.

```ts
import type { ManagedWorkflowDefinition } from '@kbn/workflows/managed';

export const MY_WORKFLOW_ID = 'system-my-plugin-health-check';

export const MY_WORKFLOW: ManagedWorkflowDefinition = {
  id: MY_WORKFLOW_ID,
  pluginId: 'myPlugin',
  version: 1,
  yaml: `name: My Plugin Health Check
enabled: true
triggers:
  - type: scheduled
    with:
      every: 1h
steps:
  - name: ping
    type: console
    with:
      message: "myPlugin is alive"`,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
};
```

Register in `managed/definitions/index.ts`:

```ts
import { MY_WORKFLOW, MY_WORKFLOW_ID } from './my_plugin';

export const managedWorkflowDefinitions = [
  // ...existing, keep sorted if the file is sorted today
  MY_WORKFLOW,
] as const;

export { MY_WORKFLOW_ID };
```

A definition **not** in `managedWorkflowDefinitions` does not exist for orphan cleanup or startup reconciliation.

## 3. `management` policy — pick before rollout

**Rule:** Choose `lifecycle`, `versionStrategy`, and `enablement` intentionally. Wrong choices delete instances at startup or block upgrades.

| Field | Value | When to use |
|---|---|---|
| `lifecycle` | `static` | Fixed set installed every startup before `ready()`; undeclared static instances are removed at reconciliation |
| `lifecycle` | `dynamic` | Per-entity / on-demand instances; only explicit `uninstall` removes them during normal operation |
| `versionStrategy` | `auto` | Platform may re-apply definition updates at startup (paired with hash comparison) |
| `versionStrategy` | `on_adopt` | Updates only on explicit `install` |
| `enablement` | `enforced` | Managed updates always re-apply `enabled` from definition |
| `enablement` | `restorable` | User enable/disable survives managed updates |

Rules of thumb:

- Platform baseline workflow, fixed instances → `static` + `auto` + `enforced`
- Per-entity instance created at runtime → `dynamic` + `on_adopt` + `restorable`

```ts
// Anti-pattern: static lifecycle but only installing on-demand — reconciliation may delete instances
management: { lifecycle: 'static', versionStrategy: 'auto', enablement: 'enforced' },
// ...then install only inside a route handler, never in start() + ready()
```

## 4. `yaml` vs `yamlTemplate`

**Rule:** Provide exactly one. Use `yaml` when the body is fully static. Use `yamlTemplate(values)` when install-time values parameterize the YAML (entity id, connector id, etc.).

### Fixed `yaml`

```ts
export const MY_WORKFLOW: ManagedWorkflowDefinition = {
  id: MY_WORKFLOW_ID,
  pluginId: 'myPlugin',
  version: 1,
  yaml: '...',
  management: { lifecycle: 'static', versionStrategy: 'auto', enablement: 'enforced' },
};
```

### `yamlTemplate` with typed values

```ts
interface MyTemplateValues {
  entityId: string;
}

export const MY_TEMPLATE_WORKFLOW = {
  id: MY_TEMPLATE_WORKFLOW_ID,
  pluginId: 'myPlugin',
  version: 1,
  yamlTemplate: ({ entityId }) => `name: Monitor ${entityId}
enabled: true
steps:
  - name: check
    type: console
    with:
      message: "Checking ${entityId}"`,
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<MyTemplateValues>;
```

- Use `as const satisfies ManagedWorkflowDefinition<TValues>` for templates so `install(..., { values })` is type-checked per workflow id.
- For `yaml`-only definitions, `: ManagedWorkflowDefinition` is enough.
- Bump `version` whenever `yaml` or `yamlTemplate` changes (human-readable label; reconciliation still uses content hash).
- If the definition uses `yamlTemplate`, add representative `values` to `templateRepresentativeValuesById` in `managed_workflow_definitions.test.ts` so CI validates rendered YAML.

## 5. Register owner (setup) — never install here

**Rule:** Call `registerManagedWorkflowOwner(pluginId)` in plugin `setup()`. Do **not** call `install` from `setup()`.

```ts
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';

export const setupManagedWorkflows = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup,
  pluginId: string
) => {
  workflowsExtensions.registerManagedWorkflowOwner(pluginId);
};
```

Why it matters:

- Orphan cleanup removes managed documents whose owner plugin is not registered.
- Startup reconciliation uses registered owners to decide what may be re-applied.

## 6. Initialize client and install (start)

**Rule:** In `start()`, call `initManagedWorkflowsClient(pluginId)` once, reuse the client for all operations. The client is bound to `pluginId` — installing another plugin's definition throws.

```ts
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import { MY_WORKFLOW_ID } from '@kbn/workflows/managed';

const managed = await workflowsExtensions.initManagedWorkflowsClient(MY_PLUGIN_ID);

await managed.install(MY_WORKFLOW_ID, {
  spaceId: GLOBAL_WORKFLOW_SPACE_ID,
  values: { entityId: 'host-42' }, // required when definition uses yamlTemplate
});
```

Client surface:

| Method | Request required? | Purpose |
|---|---|---|
| `install(id, options)` | No | Create or update persisted document |
| `uninstall(id, options)` | No | Remove instance |
| `ready()` | No | Close static startup window; reconcile orphans |
| `getWorkflowStatus(id, options)` | No | Read-only pre-flight check |
| `execute(request, id, options)` | **Yes** | Run workflow with attribution + space context |

### When to install

| Phase | Use for |
|---|---|
| `setup()` | **Never** — registration only |
| `start()` | Baseline **static** workflows; call `ready()` after all static installs |
| On-demand (after `start()`) | **Dynamic** or per-entity instances when inputs become available |

Installs are idempotent on `(definition version, persisted template values, hash)`.

### `ready()` after static installs

```ts
await managed.install(WORKFLOW_A_ID, { spaceId: 'default' });
await managed.install(WORKFLOW_B_ID, { workflowIdSuffix: 'us-east', spaceId: 'us-east' });

await managed.ready();
```

- Marks the startup window closed for static reconciliation.
- Removes persisted **static** instances whose `(workflowDocumentId, spaceId)` were not installed during this startup.
- Static installs after `ready()` log a warning (still succeed, but are not tracked for reconciliation).
- **Dynamic** workflows are never auto-removed by per-plugin reconciliation.

## 7. Workflow identity — suffixes and spaces

**Rule:** `spaceId` is **required** on every managed operation. Use a specific space id or `GLOBAL_WORKFLOW_SPACE_ID` (`'*'`) explicitly — never omit it.

**Rule:** `workflowId` and `workflowIdSuffix` are mutually exclusive. A custom `workflowId` must equal the definition id or start with `${definitionId}-`.

Calling `install` repeatedly **without** suffix resolves to the same document id (the definition id) and overwrites the previous instance. For multiple instances, pass a deterministic suffix:

| Use case | Suffix |
|---|---|
| One instance per space | space id (e.g. `'my-space'`) |
| One instance per entity | stable entity id (e.g. `'host-42'`) |
| One instance per tenant | tenant id |

```ts
await managed.install(MY_WORKFLOW_ID, {
  workflowIdSuffix: 'host-42',
  values: { entityId: 'host-42' },
  spaceId: 'my-space',
});

// Later execute without storing entity → workflowId mapping:
const workflowId = `${MY_WORKFLOW_ID}-host-42`;
await managed.execute(request, MY_WORKFLOW_ID, {
  workflowId,
  spaceId: 'my-space',
  inputs: { reason: 'periodic-check' },
});
```

### Space-scoped vs global

- **Space-scoped** (`spaceId: 'my-space'`): document visible only in that space.
- **Global** (`spaceId: GLOBAL_WORKFLOW_SPACE_ID`): one persisted document visible from every space; each **execution** must still pass the **requesting user's space** in `execute` options so results stay space-scoped. Edits and enable/disable affect all spaces (single document).

## 8. `getWorkflowStatus` — pre-flight checks

**Rule:** Use before `execute` when you need to know whether an instance is ready. Read-only; does not mutate state. Repair `missing` / `drifted` by calling `install`.

```ts
const status = await managed.getWorkflowStatus(MY_WORKFLOW_ID, {
  workflowIdSuffix: 'host-42',
  spaceId: 'my-space',
});

if (status.status !== 'intact') {
  logger.warn('Managed workflow not ready', { status });
  return;
}
```

Status priority (first match wins): `missing` → `not_managed` → `invalid` → `disabled` → `drifted` → `intact`.

## 9. `execute` — request and space required

**Rule:** Always pass a real `KibanaRequest` for attribution/authorization. Pass the **requesting user's space** in `options.spaceId` — not `'*'` — even when the workflow was installed globally.

```ts
const executionId = await managed.execute(request, MY_WORKFLOW_ID, {
  spaceId: 'my-space',
  inputs: { foo: 'bar' },
  triggeredBy: 'manual',
});
```

For suffixed instances, pass the resolved `workflowId` (see §7).

## 10. Validation and review gate

**Rule:** There is **no** Scout `APPROVED_*` fixture for managed workflows. Changes to `@kbn/workflows/managed` require **CODEOWNERS** review on that package.

CI checks in `managed_workflow_definitions.test.ts`:

- Every registered definition has valid YAML shape (triggers required).
- Template definitions have representative values in `templateRepresentativeValuesById`.
- Extension-registered triggers/steps are tolerated in validation but full runtime validation requires the owning plugin's registries.

When adding `yamlTemplate` definitions, update `templateRepresentativeValuesById` in the test file.

## Quick rule reference

| Concern | Rule | Default if omitted | When wrong |
|---|---|---|---|
| Definition id | Must start with `system-`; stable once shipped | n/a | Collides with user workflows or breaks persisted docs |
| `pluginId` | Same id in definition, `registerManagedWorkflowOwner`, and client init | n/a | Cross-plugin install throws; orphan cleanup wrong |
| Registry | Definition in `managedWorkflowDefinitions` + id re-exported | n/a | Platform ignores definition; orphan behavior wrong |
| `management` | Explicit `lifecycle`, `versionStrategy`, `enablement` | none injected | Unexpected deletes or no upgrades |
| `yaml` / `yamlTemplate` | Exactly one | n/a | Registration/validation fails |
| `version` | Bump on YAML/template change | n/a | Misleading `managedVersion` label |
| `setup()` | `registerManagedWorkflowOwner` only | n/a | Install too early or owner not registered |
| `start()` | `initManagedWorkflowsClient` → static `install`s → `ready()` | n/a | Orphans not reconciled |
| `spaceId` | Required on every operation | rejected | Wrong space or failed install |
| Multi-instance | Use `workflowIdSuffix` or full `workflowId` | overwrites same doc | Lost instances |
| `execute` | Real request + requesting space in options | n/a | Wrong attribution or invisible executions |
| Call sites | Import id const from `@kbn/workflows/managed` | n/a | Rename drift, typos |

## Author checklist

When adding a managed workflow:

1. **Plugin id**
   - [ ] User's `plugin.id` confirmed from `kibana.jsonc`
   - [ ] Same id on definition, `registerManagedWorkflowOwner`, and `initManagedWorkflowsClient`

2. **Definition** (`kbn-workflows/managed/definitions/`)
   - [ ] Id starts with `system-`; exported as a `const`
   - [ ] `pluginId` matches owning plugin
   - [ ] `version: 1` (bump on YAML changes)
   - [ ] Exactly one of `yaml` or `yamlTemplate`
   - [ ] Explicit `management` policy chosen intentionally
   - [ ] Template defs use `as const satisfies ManagedWorkflowDefinition<TValues>`
   - [ ] Added to `managedWorkflowDefinitions` in `definitions/index.ts`
   - [ ] Id re-exported from `definitions/index.ts`

3. **Tests** (`managed_workflow_definitions.test.ts`)
   - [ ] Representative `values` added for new `yamlTemplate` definitions

4. **Owner plugin** (`server/plugin.ts` or helper module)
   - [ ] `workflowsExtensions` in `requiredPlugins`
   - [ ] `registerManagedWorkflowOwner` in `setup()` only
   - [ ] `initManagedWorkflowsClient` in `start()`
   - [ ] Static workflows installed in `start()` before `ready()`
   - [ ] `ready()` called after all static installs
   - [ ] Dynamic/on-demand installs use deterministic suffixes
   - [ ] Every `install` / `execute` passes explicit `spaceId`
   - [ ] Install/execute sites import id consts — no string literals

5. **Review**
   - [ ] CODEOWNERS on `@kbn/workflows/managed` notified
   - [ ] Global vs space-scoped choice documented if non-obvious

## Reviewer checklist

When reviewing a PR that adds or modifies managed workflows:

- [ ] Definition id uses `system-` prefix; id const exported and used at call sites
- [ ] `pluginId` matches the plugin that calls `registerManagedWorkflowOwner`
- [ ] Definition appears in `managedWorkflowDefinitions` and id is re-exported
- [ ] `management` policy matches install pattern (static + `ready()` vs dynamic on-demand)
- [ ] No `install` calls in `setup()`
- [ ] Static installs happen before `ready()`; dynamic workflows not expected to survive reconciliation alone
- [ ] Multi-instance installs use suffix or full `workflowId` — not bare definition id repeated for different entities
- [ ] `spaceId` explicit everywhere; global installs use `GLOBAL_WORKFLOW_SPACE_ID`, not omitted
- [ ] `execute` passes request and requesting space (not `'*'` for execution stamping)
- [ ] Template definitions updated in `templateRepresentativeValuesById` when added/changed
- [ ] YAML references triggers/steps the owning plugin (or dependencies) actually register

## Reference implementations

| Plugin / package | Path | Notable pattern |
|---|---|---|
| Workflows example | `kbn-workflows/managed/definitions/workflows_extensions_example.ts` + `examples/workflows_extensions_example/server/plugin.ts` | `yamlTemplate` + static install at global space + `ready()` |
| Streams | `kbn-workflows/managed/definitions/streams_ki/` + `x-pack/platform/plugins/shared/streams/server/plugin.ts` | Multiple workflows; YAML in separate files; `static` + `auto` + `enforced`; dedicated install helper |
| SigEvents | `kbn-workflows/managed/definitions/sig_events/` | Multi-workflow subdirectory registry |

## Additional resources

- Extended templates and rollout examples: [reference.md](reference.md)
- Managed workflow guide: `src/platform/plugins/shared/workflows_extensions/dev_docs/MANAGED_WORKFLOWS.md`
- Public Slack channel for questions: `#one-workflow`
