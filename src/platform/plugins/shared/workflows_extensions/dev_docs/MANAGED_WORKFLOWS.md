# Managed workflows: registration and rollout patterns

This guide explains how plugin owners declare, install, and run **managed workflows** through `workflows_extensions`. Managed workflows are workflow documents owned by code (not by users): the platform creates and maintains them based on definitions you ship with your plugin.

This guide covers:

- ownership registration (setup)
- client initialization (start)
- when and where to install
- space-scoped vs global installs
- workflow identity (custom id, suffix, the reserved `system-` prefix)
- lifecycle policies (`lifecycle`, `versionStrategy`, `enablement`)
- `yaml` vs `yamlTemplate`
- executing managed workflows

## Concepts

| Concept | Meaning |
|---|---|
| **Definition** | Code-owned descriptor: `id`, `pluginId`, `yaml` or `yamlTemplate`, `management` policy. Lives in `@kbn/workflows/managed`. |
| **Owner plugin** | Plugin that owns a definition (`pluginId`). Drives reconciliation and orphan cleanup. |
| **Installed document** | Persisted workflow in `.workflows-*` indices, identified by `workflowId` + `spaceId`. |
| **Reserved namespace** | All managed definition ids start with `system-`. The platform rejects this prefix for user-defined workflows. |

Concrete flow:

1. Define a managed workflow in `@kbn/workflows/managed`.
2. From your plugin, register the owner during `setup()`.
3. Initialize a plugin-scoped client during `start()`.
4. Install instances when you have all the inputs (at `start()` or on-demand later).
5. Optionally execute via `managed.execute(...)`, with a request.

## 1) Register the owner (setup)

Register your plugin id during `setup()`. This is what tells the platform that your plugin is a legitimate owner of managed workflows.

```ts
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';

const MY_PLUGIN_ID = 'myPlugin';

export const setupManagedWorkflows = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
) => {
  workflowsExtensions.registerManagedWorkflowOwner(MY_PLUGIN_ID);
};
```

Why it matters:

- **Orphan cleanup** removes managed documents whose owner plugin is not registered.
- **Auto-update reconciliation** uses registered owners to decide what may be re-applied at startup.

> Do not call `install` from `setup()`. Setup is for registration only.

## 2) Initialize the plugin-scoped client (start)

Initialize once in `start()`. The plugin id is bound to the client, so it is reused for every `install`/`uninstall`.

```ts
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

const MY_PLUGIN_ID = 'myPlugin';

const managed = await workflowsExtensions.initManagedWorkflowsClient(MY_PLUGIN_ID);
```

Client surface:

- `install(id, options)` — no request required
- `uninstall(id, options)` — no request required
- `execute(request, id, options)` — **request required** (used for attribution and space context)

## 3) When to install

| When | Use it for |
|---|---|
| `setup()` | Never. Registration only. |
| `start()` | Baseline/static workflows you always want available. |
| On-demand (any time after `start()`) | Per-entity / per-tenant / per-space instances created in response to user or system actions. |

The same `install` API is used in both cases — there is no separate "deferred" or "post-start" entry point. As long as the plugin-scoped client has been initialized (see step 2), you can call `managed.install(...)` whenever you have the inputs you need (e.g., once a referenced entity exists, once a user enables a feature, once another plugin emits an event).

```ts
// start(): baseline install.
await managed.install(MY_WORKFLOW_ID, { spaceId: 'default' });

// On-demand: install a per-entity instance whenever it is needed.
async function onEntityCreated(entityId: string, spaceId: string) {
  await managed.install(MY_WORKFLOW_ID, {
    workflowIdSuffix: entityId,
    values: { entityId },
    spaceId,
  });
}
```

Installs are idempotent on `(definition version, persisted values)`, so it is safe to call `install` again for the same id without checking whether the document already exists.

## 3.1) Signaling readiness (`ready()`)

After installing all **static** workflows in `start()`, call `managed.ready()` to signal that the plugin has completed its startup installs:

```ts
// start()
const managed = await workflowsExtensions.initManagedWorkflowsClient(MY_PLUGIN_ID);

await managed.install(WORKFLOW_A_ID, { spaceId: 'default' });
await managed.install(WORKFLOW_B_ID, { workflowIdSuffix: 'us-east', spaceId: 'us-east' });
await managed.install(WORKFLOW_B_ID, { workflowIdSuffix: 'eu-west', spaceId: 'eu-west' });

await managed.ready();
```

### What `ready()` does

1. **Marks the startup window as closed** for this plugin. Any subsequent `install` of a static workflow logs a warning (the operation still succeeds, but it won't be tracked for reconciliation).
2. **Triggers per-plugin reconciliation** — the platform compares the set of `(workflowDocumentId, spaceId)` pairs that were installed during the startup window against all persisted static documents owned by this plugin. Any persisted document whose key was **not** seen during this startup is deleted as an orphan.

### Granularity of tracking

Reconciliation tracks installs at the **full document identity** level: `${workflowDocumentId}:${spaceId}`. The `workflowDocumentId` includes any suffix (e.g., `system-my-wf-us-east`). This means:

- Different suffix-based instances are tracked independently.
- The same definition in different spaces is tracked independently.
- Removing one suffix variant or one space from the `start()` install set causes only that specific instance to be cleaned up — other instances of the same definition remain untouched.

**Example:**

Previous startup installed:
- `system-monitor-host-a` in space `prod`
- `system-monitor-host-b` in space `prod`
- `system-monitor-host-a` in space `staging`

This startup only installs:
- `system-monitor-host-b` in space `prod`

After `ready()`: the two instances that were not re-installed (`system-monitor-host-a:prod` and `system-monitor-host-a:staging`) are removed.

### Dynamic workflows are excluded

Reconciliation only targets documents whose definition has `lifecycle: 'static'`. Dynamic workflows are never auto-cleaned — their lifecycle is explicitly managed by the owning plugin via `install`/`uninstall`.

## 4) Space-scoped vs global installs

Managed workflows can live in a specific space or in the **global** space (`'*'`, exported as `GLOBAL_WORKFLOW_SPACE_ID` from `@kbn/workflows/server`).

### Space-scoped (`spaceId: 'my-space'`)

Use a specific space when the workflow only makes sense inside that space:

- the related entity is space-aware (e.g., a rule, connector, or saved object that belongs to a single space)
- a user actively runs a flow in a specific space
- the workflow has overrides or template values that are space-specific
- the workflow must not be visible or executable from other spaces

```ts
await managed.install(MY_WORKFLOW_ID, { spaceId: 'my-space' });
```

### Global (`spaceId: '*'`)

Use the global space when the same workflow definition should serve every space, with execution-time isolation:

- the workflow definition is **visible and executable from every space** (one persisted document)
- each execution **runs in the context of the invoking space** — the execution document is stamped with the requesting `spaceId`
- execution results are **only visible inside the space that triggered the run**

This is the right choice for:

- system-level workflows that don't need a per-space copy but still must respect per-space data boundaries at runtime
- workflows that are space-agnostic (their behavior does not depend on the invoking space at all)

```ts
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';

await managed.install(MY_WORKFLOW_ID, { spaceId: GLOBAL_WORKFLOW_SPACE_ID });
```

### No default

`spaceId` is required for managed operations. Omitted/empty `spaceId` is rejected. Use `GLOBAL_WORKFLOW_SPACE_ID` (`'*'`) explicitly when you want a global install.

## 5) Workflow identity

Install options:

- `workflowId` — full custom persisted id
- `workflowIdSuffix` — suffix appended to the definition id

Constraints:

- `workflowId` and `workflowIdSuffix` are mutually exclusive
- a custom `workflowId` must equal the definition id, or start with `${definitionId}-`

### `system-` is reserved

All managed definition ids **must** start with `system-`. The platform rejects this prefix for user-defined workflows, so:

- managed ids never collide with user workflows
- because suffixed ids inherit the `system-` prefix, suffix-based instances stay inside the reserved namespace

For a definition `system-entity-monitor`, valid persisted ids look like:

- `system-entity-monitor`
- `system-entity-monitor-host-42`
- `system-entity-monitor-my-space`

### Why id / suffix matters

Calling `install` repeatedly **without** `workflowId` or `workflowIdSuffix` resolves to the same persisted id (the definition id). Each install **overwrites** the previous document instead of creating a new instance.

To create the same managed workflow as multiple distinct instances, callers must use a deterministic id or suffix.

### Recommended patterns

| Use case | Suffix to use |
|---|---|
| One instance per space | the space id (e.g., `'my-space'`) |
| One instance per entity | a stable entity id (e.g., `'host-42'`, `'rule-uuid'`) |
| One instance per tenant | the tenant id |

Because the suffix is part of the persisted id, the resulting `workflowId` is **deterministic** and re-derivable. Callers can invoke a per-entity workflow later without storing an `entity → workflowId` (or `space → workflowId`) mapping.

```ts
// Per-space instance.
await managed.install(MY_WORKFLOW_ID, {
  workflowIdSuffix: 'my-space',
  spaceId: 'my-space',
});

// Per-entity instance.
await managed.install(MY_WORKFLOW_ID, {
  workflowIdSuffix: 'host-42',
  values: { entityId: 'host-42' },
  spaceId: 'my-space',
});

// Later, derive id and execute:
const workflowId = `${MY_WORKFLOW_ID}-host-42`;
await managed.execute(request, MY_WORKFLOW_ID, {
  workflowId,
  spaceId: 'my-space',
});
```

## 6) Lifecycle policies (`management`)

Every managed definition declares a policy (no default policy is injected at runtime):

```ts
management: {
  lifecycle: 'static' | 'dynamic',
  versionStrategy: 'auto' | 'on_adopt',
  enablement: 'enforced' | 'restorable',
}
```

| Field | Value | Behavior |
|---|---|---|
| `lifecycle` | `static` | Baseline workflow that must be installed every startup before `ready()`. Any persisted static instance not re-installed during the startup window is removed by reconciliation. |
| `lifecycle` | `dynamic` | Instance-like workflow created on-demand from runtime context (per entity / tenant / etc.). Not auto-removed by per-plugin reconciliation — lifecycle is explicitly managed by the owning plugin via `install`/`uninstall`. |
| `versionStrategy` | `auto` | Startup reconciliation may re-apply updates when the definition version changes. |
| `versionStrategy` | `on_adopt` | Startup never auto-upgrades. Updates only happen on explicit `install`. |
| `enablement` | `enforced` | Managed updates always re-apply enabled state from the definition. |
| `enablement` | `restorable` | User-driven enabled/disabled state is preserved across managed updates. |

Choosing rules of thumb:

- platform-owned background workflow with a fixed set of instances → `static` + `auto` + `enforced`
- per-entity / per-tenant instance created or removed at runtime → `dynamic` + `on_adopt` + `restorable`

Key distinction: **static** workflows are declarative — the set installed at startup is the source of truth and anything not declared is cleaned up. **Dynamic** workflows are imperative — only explicit `uninstall` removes them during normal operation.

> **Global orphan cleanup (both lifecycles):** Regardless of lifecycle, all managed documents are removed at startup if their owning plugin is no longer registered or their definition has been removed from `@kbn/workflows/managed`. This ensures that uninstalling a plugin or deleting a definition leaves no dangling documents behind.

## 7) Authoring a definition

All managed workflow definitions live in `@kbn/workflows/managed/definitions/`. Each workflow gets its own directory with versioned yaml files, mirroring the saved-object model-version pattern.

### Directory structure

```
kbn-workflows/managed/
├── index.ts                          (registry, exports, type inference)
├── types.ts                          (ManagedWorkflowDefinition, etc.)
├── managed_workflow_definitions.test.ts
└── definitions/
    ├── index.ts                      (barrel: re-exports all definitions + IDs)
    └── my_workflow/
        ├── types.ts                  (template values interface, if using yamlTemplate)
        ├── definition.ts             (id, pluginId, version, management, wires latest yaml)
        ├── latest.ts                 (re-exports from current version)
        ├── v1.ts                     (yaml body — string or template function)
        └── (future: v2.ts, v3.ts)
```

### Steps to add a new workflow

1. **Create the workflow directory** under `definitions/` using snake_case.

2. **Create `types.ts`** (only needed for `yamlTemplate` workflows):

```ts
// definitions/my_workflow/types.ts
export interface MyWorkflowTemplateValues {
  entityId: string;
}
```

3. **Create the version file** (`v1.ts`) with only the yaml body:

```ts
// definitions/my_workflow/v1.ts
import type { MyWorkflowTemplateValues } from './types';

export const yamlTemplate = ({ entityId }: MyWorkflowTemplateValues) =>
  `name: Monitor ${entityId}
enabled: true
triggers:
  - type: scheduled
    with:
      every: 5m
steps:
  - name: check
    type: console
    with:
      message: "Checking ${entityId}"
`;
```

For a fixed `yaml` workflow (no template values), export a string instead:

```ts
// definitions/my_workflow/v1.ts
export const yaml = `name: My Workflow
enabled: true
...`;
```

4. **Create `latest.ts`** pointing to the current version:

```ts
// definitions/my_workflow/latest.ts
export { yamlTemplate } from './v1';
```

5. **Create `definition.ts`** with metadata wiring the latest yaml:

```ts
// definitions/my_workflow/definition.ts
import { yamlTemplate } from './latest';
import type { MyWorkflowTemplateValues } from './types';
import type { ManagedWorkflowDefinition } from '../../types';

export const MY_WORKFLOW_ID = 'system-my-workflow';

export type { MyWorkflowTemplateValues } from './types';

export const MY_WORKFLOW = {
  id: MY_WORKFLOW_ID,
  pluginId: 'myPlugin',
  yamlTemplate,
  version: 1,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
} as const satisfies ManagedWorkflowDefinition<MyWorkflowTemplateValues>;
```

6. **Register in the barrel** (`definitions/index.ts`):

```ts
export { MY_WORKFLOW, MY_WORKFLOW_ID } from './my_workflow/definition';
export type { MyWorkflowTemplateValues } from './my_workflow/definition';
```

7. **Add to the registry** in `managed/index.ts`:

```ts
import { MY_WORKFLOW, MY_WORKFLOW_ID } from './definitions';

export const managedWorkflowDefinitions = [
  // ...existing definitions
  MY_WORKFLOW,
] as const;

export { MY_WORKFLOW_ID };
```

### Version bump workflow

When changing the yaml body of an existing workflow:

1. Create a new version file (`v2.ts`) with the updated yaml.
2. Update `latest.ts` to re-export from `v2`.
3. Bump the `version` field in `definition.ts` (e.g., `version: 2`).

The platform compares the persisted `managedDefinitionVersion` against the definition's `version`. A mismatch triggers an overwrite on the next reconciliation pass (for `versionStrategy: 'auto'`) or explicit `install` (for `on_adopt`).

### Why version files?

- **History visibility**: Git blame and file history per version show exactly what changed and when.
- **Rollback**: Reverting `latest.ts` to point at a prior version is a one-line change.
- **Future migrations**: The structure allows adding per-version transforms or metadata without refactoring.

> Never hardcode the literal `'system-...'` string at call sites — always import the id const. This keeps definition ownership and rename safety in one place.

## 8) `yaml` vs `yamlTemplate`

A managed definition must provide exactly one of `yaml` or `yamlTemplate`.

### `yaml` — fixed definition

Use when the workflow body is fully static and install-time variables are not needed.

```ts
import type { ManagedWorkflowDefinition } from '@kbn/workflows/managed';

export const HEALTH_CHECK_WORKFLOW_ID = 'system-workflows-management-health-check';

export const HEALTH_CHECK_WORKFLOW: ManagedWorkflowDefinition = {
  id: HEALTH_CHECK_WORKFLOW_ID,
  pluginId: 'workflowsManagement',
  yaml: `name: Workflows Management Health Check
enabled: true
triggers:
  - type: scheduled
    with:
      every: 1h
steps:
  - name: ping
    type: console
    with:
      message: "workflows-management is alive"`,
  version: 1,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
};

// Install once at start():
await managed.install(HEALTH_CHECK_WORKFLOW_ID, {
  spaceId: GLOBAL_WORKFLOW_SPACE_ID,
});
```

### `yamlTemplate(values)` — install-time parameterization

Use when some values are only known at install time (entity id, connector id, rule id, etc.). The template renders at install/update time, install values are persisted alongside the document, and re-installs are idempotent on `(definition version, persisted values)`.

```ts
import type { ManagedWorkflowDefinition } from '@kbn/workflows/managed';

interface MyTemplateValues {
  entityId: string;
}

export const MY_TEMPLATE_WORKFLOW_ID = 'system-my-template';

export const MY_TEMPLATE_WORKFLOW = {
  id: MY_TEMPLATE_WORKFLOW_ID,
  pluginId: 'myPlugin',
  yamlTemplate: ({ entityId }) => `name: Monitor ${entityId}
enabled: true
triggers:
  - type: scheduled
    with:
      every: 5m
steps:
  - name: check
    type: console
    with:
      message: "Checking ${entityId}"`,
  version: 1,
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<MyTemplateValues>;

// Install:
await managed.install(MY_TEMPLATE_WORKFLOW_ID, {
  workflowIdSuffix: 'host-42',
  values: { entityId: 'host-42' },
  spaceId: 'my-space',
});
```

**Why `satisfies` for templates?** `as const satisfies ManagedWorkflowDefinition<MyTemplateValues>` validates the object against the type while preserving the literal `id` and `yamlTemplate` signature for downstream type inference. This allows the platform to infer `TValues` at call sites — `values` is type-checked for this workflow id (`entityId` typo/wrong type fails at compile time).

For `yaml`-based definitions (no template values), a direct annotation (`: ManagedWorkflowDefinition`) is sufficient since there is no `values` type to infer.

## 9) Executing managed workflows

Execution always runs in the context of a `KibanaRequest`:

- the **request** is required for user attribution and authorization.
- the **execution document's `spaceId`** is taken from `options.spaceId` — pass the requesting space explicitly so the execution and its results are scoped to that space (this is what makes per-space visibility work for global workflows).
- `options.spaceId` is required. Omitting it rejects the managed operation.

```ts
const executionId = await managed.execute(request, MY_WORKFLOW_ID, {
  spaceId: 'my-space',
  inputs: { foo: 'bar' },
  triggeredBy: 'manual',
});
```

For a per-entity instance installed with a deterministic suffix, pass the resolved `workflowId`:

```ts
const workflowId = `${MY_WORKFLOW_ID}-host-42`;

await managed.execute(request, MY_WORKFLOW_ID, {
  workflowId,
  spaceId: 'my-space',
  inputs: { reason: 'periodic-check' },
});
```

### Global workflows at execution time

Global workflows (`spaceId: '*'`) are visible from any space, but each execution must still be stamped with a real space so results stay scoped:

- the workflow lookup uses `includeGlobal: true`, so the global document is found from any space.
- the execution document is stamped with the `spaceId` you pass in `options` — pass the requesting user's space, not `'*'`.
- consequence: results of a global workflow run are visible only inside the space that triggered the run.

## 10) Rollout checklist

1. Add the definition in `@kbn/workflows/managed` with the correct `pluginId` and a `system-` id; export the id as a const.
2. Add the definition to `managedWorkflowDefinitions` in `managed/index.ts`, and re-export the id from the package barrel.
3. Register the owner plugin id in `setup()`.
4. Initialize the plugin-scoped client in `start()`.
5. Install baseline (static) workflows at `start()`. Use on-demand installs (the same `install` API) for dynamic instances.
6. Call `managed.ready()` after all static installs in `start()` — this triggers per-plugin reconciliation.
7. Pick an explicit `spaceId` strategy: space-scoped or global.
8. For multiple instances, always pass `workflowIdSuffix` (or `workflowId`) — never rely on the definition id alone.
9. Pick lifecycle policy intentionally (`static`/`dynamic`, `auto`/`on_adopt`, `enforced`/`restorable`).
10. Use `yamlTemplate` only when install-time values are required.
11. Execute via `managed.execute(request, ...)`; for dynamic instances, pass the deterministic `workflowId`.
