# Event-driven triggers: contributing and approval

## Contributing Event-Driven Triggers

This section provides a complete guide for contributors who want to add event-driven triggers so workflows can subscribe and run when events occur. Triggers are registered from **your plugin**, not from inside `workflows_extensions` (same ownership rule as [custom steps](STEPS.md#contributing-custom-step-types)).

**Quick checklist:**

1. Define common trigger (id + eventSchema) in your plugin
2. Register on server and public in plugin `setup()`
3. Emit events via request context or direct `emitEvent`
4. Add to approved list and get workflows-eng approval

### Trigger ID and naming conventions

Trigger IDs use the following convention:

- Format: `<namespace>.<event>` — use **kebab-case** for the namespace, **camelCase** for the event
- ✅ Good: `"my-namespace.customTrigger"`, `"cases.updated"`, `"custom-feature.alertFired"`
- ⚠️ Allowed: Inherited forms from OpenAPI/connectors/platform-owned contracts
- ❌ Bad: `"my_trigger"` (no namespace), `"custom_trigger"` (event not camelCase)

### Step 1: Define common trigger (id + eventSchema)

Create a shared definition (e.g. `common/triggers/my_trigger.ts`) in your plugin:

```typescript
import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';

/** Trigger id: kebab-case namespace, camelCase event */
export const MY_TRIGGER_ID = 'my-plugin.myTrigger' as const;

export const myTriggerEventSchema = z.object({
  message: z.string().describe('The message text for the event.'),
  source: z.string().optional().describe('The source that emitted the event.'),
  category: z.string().optional().describe('Category for filtering in workflow conditions.'),
});

export type MyTriggerEvent = z.infer<typeof myTriggerEventSchema>;

export const commonMyTriggerDefinition: CommonTriggerDefinition = {
  id: MY_TRIGGER_ID,
  eventSchema: myTriggerEventSchema,
};
```

- Use `.describe()` on schema fields so the UI and docs show helpful text.
- `eventSchema` must be a Zod object schema; payloads are validated at emit time.

### Step 2: Register on server

In your plugin's server `setup()`, register the common definition (id + eventSchema only):

```typescript
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { commonMyTriggerDefinition } from '../common/triggers/my_trigger';

export const registerTriggers = (workflowsExtensions: WorkflowsExtensionsServerPluginSetup) => {
  workflowsExtensions.registerTriggerDefinition(commonMyTriggerDefinition);
};

// In plugin.ts setup():
registerTriggers(plugins.workflowsExtensions);
```

Reference: `examples/workflows_extensions_example/server/triggers/index.ts`.

### Step 3: Register on public

Create a public definition with UI metadata and register it in your plugin's public `setup()`:

```typescript
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { MY_TRIGGER_ID, commonMyTriggerDefinition } from '../common/triggers/my_trigger';

export const myTriggerPublicDefinition: PublicTriggerDefinition = {
  ...commonMyTriggerDefinition,
  title: i18n.translate('myPlugin.myTrigger.title', { defaultMessage: 'My trigger' }),
  description: i18n.translate('myPlugin.myTrigger.description', {
    defaultMessage: 'Emitted when something happens. Use in workflow triggers to run on this event.',
  }),
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/star').then(({ icon }) => ({ default: icon }))
  ),
  documentation: {
    details: 'Filter when this workflow runs using KQL on event properties (e.g. event.category, event.message).',
    examples: [
      `## Match by category\n\`\`\`yaml\ntriggers:\n  - type: ${MY_TRIGGER_ID}\n    on:\n      condition: 'event.category: "alerts"'\n\`\`\``,
    ],
  },
  snippets: { condition: 'event.category: "alerts"' },
};

// In public plugin setup():
plugins.workflowsExtensions.registerTriggerDefinition(myTriggerPublicDefinition);
```

**Async registration (optional):** To keep your plugin's main bundle small, you can register a **loader** instead of the definition. The workflows app awaits `workflowsExtensions.isReady()` before rendering, so trigger definitions are available when the UI needs them:

```typescript
// In public plugin setup():
plugins.workflowsExtensions.registerTriggerDefinition(() =>
  import('./triggers/custom_trigger').then((m) => m.myTriggerPublicDefinition)
);
```

Reference: `examples/workflows_extensions_example/public/triggers/custom_trigger.ts` and `public/triggers/index.ts`.

### Step 4: Emit events — two ways

**Option A — From a route (request context, recommended)**

When you have an HTTP request, use the request-scoped client so space and request are taken from the current context:

1. Add `workflowsExtensions` to your plugin's `requiredPlugins` in `kibana.jsonc`.
2. Type your route handler context to include `workflows: WorkflowsRouteHandlerContext` (from `@kbn/workflows-extensions/server`).
3. In the route handler:

```typescript
const client = (await context.workflows).getWorkflowsClient();
await client.emitEvent(MY_TRIGGER_ID, {
  message: request.body.message,
  source: 'my-api',
  category: 'alerts',
});
```

Reference: `examples/workflows_extensions_example/server/request_context.ts` and `server/routes/emit_event.ts`.

**Option B — Direct (when you have request and space)**

When emitting from background code (e.g. a job) where you have a `KibanaRequest` and `spaceId`, use the start contract:

```typescript
// In code that has access to workflowsExtensions start (e.g. another plugin):
await workflowsExtensions.emitEvent({
  triggerId: MY_TRIGGER_ID,
  spaceId: targetSpaceId,
  payload: { message: 'Event from job', source: 'background', category: 'audit' },
  request: myKibanaRequest, // e.g. system request for background execution
});
```

Payload is validated against the trigger's `eventSchema`; if validation fails, `emitEvent` throws. A trigger event handler must be registered (e.g. by `workflows_management`) for workflows to run.

### Step 5: Trigger approval

All new triggers must be approved. See [Trigger Definition Approval Process](#trigger-definition-approval-process) below.

### Example workflow YAML

Users subscribe to your trigger in a workflow:

```yaml
triggers:
  - type: my-plugin.myTrigger
    on:
      condition: 'event.category: "alerts"'
steps:
  - name: handle_event
    type: console.log
    with:
      message: "Event: {{ context.event.message }}"
```

Event payload is available in workflows as `context.event`.

### Full example

See `examples/workflows_extensions_example` for a complete trigger: common definition, server and public registration, route that emits via request context, and approval entry.

## Trigger Definition Approval Process

All event-driven trigger definitions must be approved by the workflows-eng team before being merged. This is enforced through a Scout API test that validates registered triggers against an approved list.

### How it works

1. When you register a new trigger, the test detects it during CI runs.
2. Each trigger has a **schema hash** (derived from its `eventSchema`). The test compares registered triggers against the approved list.
3. The approved list lives in `test/scout/api/fixtures/approved_trigger_definitions.ts`.

### Adding a new trigger

1. **Register your trigger** (common + server + public) as in [Contributing Event-Driven Triggers](#contributing-event-driven-triggers).
2. **Run the server** and GET `internal/workflows_extensions/trigger_definitions` to obtain the `schemaHash` for your trigger id.
3. **Add an entry** to `test/scout/api/fixtures/approved_trigger_definitions.ts` (alphabetically by id):

   ```typescript
   export const APPROVED_TRIGGER_DEFINITIONS: Array<{ id: string; schemaHash: string }> = [
     { id: 'my-plugin.myTrigger', schemaHash: 'a1b2c3d4e5f6...' },
   ];
   ```

4. **Get approval** from the workflows-eng team (via PR review).

If you change the trigger's `eventSchema`, the schema hash changes; update the approved list and get re-approval.
