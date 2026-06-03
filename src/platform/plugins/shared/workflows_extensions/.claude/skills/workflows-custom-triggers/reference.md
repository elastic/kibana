# Workflow Trigger Registration — Reference

Extended templates and patterns that are too long to fit in `SKILL.md`. Read this only when you need the full shape; the main skill has the rules.

## 1. Full scaffold for a new trigger

A minimal end-to-end trigger across common, server, public, and emit. Copy and rename for a real trigger.

### `common/triggers/my_trigger.ts`

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
      i18n.translate('myPlugin.myTrigger.documentation.exampleMessage', {
        defaultMessage: `## Match any message
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.message: *'
\`\`\``,
        values: { triggerId: MyTriggerId },
      }),
    ],
  },
  snippets: { condition: 'event.category: "alerts"' },
};
```

### `server/triggers/index.ts`

```ts
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { myTriggerCommonDefinition } from '../../common/triggers/my_trigger';

export const registerTriggerDefinitions = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
): void => {
  workflowsExtensions.registerTriggerDefinition(myTriggerCommonDefinition);
};
```

### `public/triggers/my_trigger.ts`

```ts
import React from 'react';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import { myTriggerCommonDefinition } from '../../common/triggers/my_trigger';

export const myTriggerPublicDefinition: PublicTriggerDefinition = {
  ...myTriggerCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/bolt').then(({ icon }) => ({ default: icon }))
  ),
};
```

### `public/triggers/index.ts`

```ts
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

export const registerTriggerDefinitions = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
): void => {
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./my_trigger').then((m) => m.myTriggerPublicDefinition)
  );
};
```

### Emit from a route

```ts
import type { IRouter } from '@kbn/core/server';
import type { WorkflowsExtensionsRequestHandlerContext } from '@kbn/workflows-extensions/server';
import { MyTriggerId } from '../../common/triggers/my_trigger';

export function registerMyTriggerRoute(
  router: IRouter<WorkflowsExtensionsRequestHandlerContext>
): void {
  router.post(
    { path: '/api/my_plugin/emit', validate: { body: schema.object({ message: schema.string() }) } },
    async (context, request, response) => {
      const workflows = await context.workflows;
      await workflows.emitEvent(MyTriggerId, {
        message: request.body.message,
        source: 'my-api',
        category: 'alerts',
      });
      return response.ok({ body: { ok: true } });
    }
  );
}
```

## 2. Nested event schema

Nested objects are valid in `eventSchema` and appear in KQL as dot paths (e.g. `event.foo.bar.baz`):

```ts
export const myTriggerEventSchema = z.object({
  message: z.string().describe('The message text for the event.'),
  foo: z
    .object({
      bar: z.object({
        baz: z.string(),
      }),
    })
    .optional()
    .describe('Example nested property (foo.bar.baz).'),
});
```

Reference: `examples/workflows_extensions_example/common/triggers/custom_trigger.ts`

## 3. Multiple triggers from one catalog (Alerting v2 pattern)

Keep registration DRY when several triggers share emit mapping logic:

```ts
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { MY_WORKFLOW_TRIGGERS } from '../events/my_workflow_subscriber/triggers';

export function registerTriggerDefinitions(
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
): void {
  for (const trigger of MY_WORKFLOW_TRIGGERS) {
    workflowsExtensions.registerTriggerDefinition(trigger.definition);
  }
}
```

Reference: `x-pack/platform/plugins/shared/alerting_v2/server/lib/workflow_extensions/register_trigger_definitions.ts`

## 4. Event-chain depth loop demo

The example plugin registers `example.loopTrigger` and a route that re-emits it. Use this workflow to demo `workflowsExecutionEngine.eventDriven.maxChainDepth`:

```yaml
name: Example loop trigger (event-chain depth demo)
description: >-
  Triggered by example.loopTrigger; calls emit_loop to re-emit with the next iteration until maxChainDepth is reached.
enabled: true

triggers:
  - type: example.loopTrigger

steps:
  - name: reemit_loop
    type: kibana.request
    with:
      method: POST
      path: /api/workflows_extensions_example/emit_loop
      body:
        iteration: '{{ event.iteration | default: 0 | plus: 1 }}'
```

1. Run Kibana with examples: `yarn start --run-examples`.
2. Create the workflow above in the UI.
3. Start the loop:
   ```bash
   curl -X POST -u elastic:changeme -H 'Content-Type: application/json' \
     'http://localhost:5601/api/workflows_extensions_example/emit_loop' -d '{}'
   ```

Use **`kibana.request`**, not a generic HTTP connector — only it attaches event-chain headers on outbound calls.

Reference: `examples/workflows_extensions_example/common/triggers/loop_trigger.ts`, [TRIGGERS.md § Event-chain depth demo](../../dev_docs/TRIGGERS.md#event-chain-depth-loop-demo)

## 5. Per-trigger workflow event policy (YAML)

When workflows re-emit events, users can control loop behavior on registered triggers:

```yaml
triggers:
  - type: my-namespace.myTrigger
    on:
      condition: 'event.category: "alerts"'
      workflowEvents: avoid-loop   # default; or ignore | allow-all
```

- **`avoid-loop`** (default): run on workflow-attributed emits unless the cycle guard blocks it
- **`ignore`**: skip scheduling when the emit is workflow-attributed
- **`allow-all`**: opt out of the cycle guard (depth cap still applies)
