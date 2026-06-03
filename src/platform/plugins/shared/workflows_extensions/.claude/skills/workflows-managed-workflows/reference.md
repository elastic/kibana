# Workflow Managed Workflow Registration — Reference

Extended templates and patterns that are too long to fit in `SKILL.md`. Read this only when you need the full shape; the main skill has the rules.

## 1. Full scaffold for a new managed workflow

### `kbn-workflows/managed/definitions/my_plugin.ts`

```ts
import type { ManagedWorkflowDefinition } from '../types';

export const MY_PLUGIN_ONBOARDING_WORKFLOW_ID = 'system-my-plugin-onboarding';

export const MY_PLUGIN_ONBOARDING_WORKFLOW: ManagedWorkflowDefinition = {
  id: MY_PLUGIN_ONBOARDING_WORKFLOW_ID,
  pluginId: 'myPlugin',
  version: 1,
  yaml: `name: My Plugin Onboarding
enabled: true
triggers:
  - type: scheduled
    with:
      every: 1d
steps:
  - name: welcome
    type: console
    with:
      message: "My Plugin onboarding workflow"`,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
};
```

### `kbn-workflows/managed/definitions/index.ts` (excerpt)

```ts
import { MY_PLUGIN_ONBOARDING_WORKFLOW, MY_PLUGIN_ONBOARDING_WORKFLOW_ID } from './my_plugin';

export const managedWorkflowDefinitions = [
  // ...existing definitions
  MY_PLUGIN_ONBOARDING_WORKFLOW,
] as const;

export { MY_PLUGIN_ONBOARDING_WORKFLOW_ID };
```

### `my-plugin/server/managed_workflows/index.ts`

```ts
export { MY_PLUGIN_ONBOARDING_WORKFLOW_ID } from '@kbn/workflows/managed';

export const MY_PLUGIN_MANAGED_WORKFLOW_OWNER = 'myPlugin';
```

### `my-plugin/server/plugin.ts` (excerpt)

```ts
import type { CoreSetup, CoreStart, Logger, Plugin } from '@kbn/core/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import {
  MY_PLUGIN_MANAGED_WORKFLOW_OWNER,
  MY_PLUGIN_ONBOARDING_WORKFLOW_ID,
} from './managed_workflows';

export class MyPlugin implements Plugin {
  constructor(private readonly logger: Logger) {}

  setup(_core: CoreSetup, plugins: { workflowsExtensions: WorkflowsExtensionsServerPluginSetup }) {
    plugins.workflowsExtensions.registerManagedWorkflowOwner(MY_PLUGIN_MANAGED_WORKFLOW_OWNER);
    return {};
  }

  start(_core: CoreStart, plugins: { workflowsExtensions: WorkflowsExtensionsServerPluginStart }) {
    void this.installManagedWorkflows(plugins.workflowsExtensions);
    return {};
  }

  private async installManagedWorkflows(
    workflowsExtensions: WorkflowsExtensionsServerPluginStart
  ): Promise<void> {
    try {
      const managed = await workflowsExtensions.initManagedWorkflowsClient(
        MY_PLUGIN_MANAGED_WORKFLOW_OWNER
      );

      await managed.install(MY_PLUGIN_ONBOARDING_WORKFLOW_ID, {
        spaceId: GLOBAL_WORKFLOW_SPACE_ID,
      });

      await managed.ready();
      this.logger.info('My Plugin: managed workflow installed');
    } catch (error) {
      this.logger.warn('My Plugin: failed to install managed workflow', { error });
    }
  }
}
```

## 2. Template workflow with typed install values

```ts
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../types';

export const MY_ENTITY_MONITOR_WORKFLOW_ID = 'system-my-plugin-entity-monitor';

export interface MyEntityMonitorTemplateValues extends ManagedWorkflowTemplateValues {
  entityId: string;
}

export const MY_ENTITY_MONITOR_WORKFLOW = {
  id: MY_ENTITY_MONITOR_WORKFLOW_ID,
  pluginId: 'myPlugin',
  version: 1,
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
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'on_adopt',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<MyEntityMonitorTemplateValues>;
```

On-demand install when an entity is created:

```ts
async function onEntityCreated(
  managed: PluginScopedManagedWorkflowsApi,
  entityId: string,
  spaceId: string
): Promise<void> {
  await managed.install(MY_ENTITY_MONITOR_WORKFLOW_ID, {
    workflowIdSuffix: entityId,
    values: { entityId },
    spaceId,
  });
}
```

Add to `managed_workflow_definitions.test.ts`:

```ts
const templateRepresentativeValuesById: ManagedWorkflowTemplateValuesById = {
  // ...existing
  [MY_ENTITY_MONITOR_WORKFLOW_ID]: {
    entityId: 'host-42',
  },
};
```

## 3. YAML in external files (Streams pattern)

```ts
import ONBOARDING_YAML from './onboarding.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const STREAMS_KI_ONBOARDING_WORKFLOW_ID = 'system-streams-ki-onboarding';

const STREAMS_KI_WORKFLOW_MANAGEMENT = {
  lifecycle: 'static',
  versionStrategy: 'auto',
  enablement: 'enforced',
} as const;

export const STREAMS_KI_ONBOARDING_WORKFLOW = {
  id: STREAMS_KI_ONBOARDING_WORKFLOW_ID,
  pluginId: 'streams',
  version: 1,
  yaml: ONBOARDING_YAML,
  management: STREAMS_KI_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition;
```

Reference: `src/platform/packages/shared/kbn-workflows/managed/definitions/streams_ki/`

## 4. Multiple static installs + `ready()`

```ts
const managed = await workflowsExtensions.initManagedWorkflowsClient(MY_PLUGIN_ID);

await managed.install(WORKFLOW_A_ID, { spaceId: 'default' });
await managed.install(WORKFLOW_B_ID, {
  workflowIdSuffix: 'us-east',
  spaceId: 'us-east',
});
await managed.install(WORKFLOW_B_ID, {
  workflowIdSuffix: 'eu-west',
  spaceId: 'eu-west',
});

await managed.ready();
```

After `ready()`, any persisted static instance whose `(workflowDocumentId, spaceId)` was **not** installed during this startup window is deleted. Dynamic instances are untouched.

## 5. Execute a global workflow from a route

Global workflow installed once:

```ts
await managed.install(MY_WORKFLOW_ID, { spaceId: GLOBAL_WORKFLOW_SPACE_ID });
```

Execute from a route — stamp execution with the **requesting space**:

```ts
router.post({ path: '/api/my_plugin/run-onboarding', validate: false }, async (context, request, response) => {
  const managed = await plugins.workflowsExtensions.initManagedWorkflowsClient(MY_PLUGIN_ID);
  const spaceId = (await context.core).spaces?.getActiveSpaceId?.() ?? 'default';

  const status = await managed.getWorkflowStatus(MY_WORKFLOW_ID, { spaceId: GLOBAL_WORKFLOW_SPACE_ID });
  if (status.status !== 'intact') {
    return response.customError({ statusCode: 503, body: { message: 'Workflow not ready' } });
  }

  const executionId = await managed.execute(request, MY_WORKFLOW_ID, {
    spaceId, // requesting user's space — not '*'
    inputs: { source: 'api' },
    triggeredBy: 'manual',
  });

  return response.ok({ body: { executionId } });
});
```

## 6. Uninstall a dynamic instance

```ts
await managed.uninstall(MY_ENTITY_MONITOR_WORKFLOW_ID, {
  workflowIdSuffix: entityId,
  spaceId: 'my-space',
});
```

Use when an entity is deleted and the workflow instance should not remain.

## 7. Version bump workflow

When changing YAML or template content:

1. Edit `yaml` / `yamlTemplate` in the definition file.
2. Increment `version` (e.g. `1` → `2`).
3. For `versionStrategy: 'auto'` static workflows, startup reconciliation re-applies when content hash differs.
4. For `on_adopt`, call `install` explicitly to push the update to existing instances.

Reconciliation uses **definition hash** as source of truth; `version` is a human-readable `managedVersion` on the persisted document.

## 8. Global vs space-scoped decision matrix

| Need | Install with | Execution `spaceId` |
|---|---|---|
| Workflow only for one space | `spaceId: 'that-space'` | Same space |
| Same definition, isolated executions per space | `spaceId: GLOBAL_WORKFLOW_SPACE_ID` | Requesting user's space each time |
| Per-space enable/disable control | Space-scoped install (one doc per space) | N/A — avoid global single doc |
| Per-space YAML overrides | Space-scoped install | N/A — global has no per-space override today |

Global caveat: one document — edits and enable/disable affect **all** spaces immediately; only execution **results** are space-scoped.
