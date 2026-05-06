# Workflows Extensions Example Plugin

This example plugin demonstrates how to register a custom workflow step using the workflows extensions API.

## How to run

Example plugins are only loaded when Kibana is started with the `--run-examples` flag. Start Kibana with:

```bash
yarn start --run-examples
```

Then open **Developer examples** in the sidebar and click **Workflows Extensions Example**.

## Overview

The plugin registers a `setvar` step that allows you to set variables in the workflow context. These variables can then be referenced in subsequent steps using template syntax.

## Structure

- `common/types.ts` - Shared step definition (id, inputSchema, outputSchema)
- `server/` - Server-side step handler implementation
- `public/` - Public-side step metadata (label, description, icon, documentation)

## Step Definition

### Server Configuration

The server configuration includes:
- `id` - Unique step identifier
- `inputSchema` - JSON Schema for input validation
- `outputSchema` - JSON Schema for output validation
- `handler` - Function that executes the step logic

### Public Configuration

The public configuration includes:
- `id` - Must match server-side ID
- `inputSchema` - Must match server-side schema
- `outputSchema` - Must match server-side schema
- `label` - User-facing label
- `description` - User-facing description
- `icon` - icon image (preferably lazy loaded)
- `documentation` - Documentation with summary, details, and examples
- `actionsMenuCatalog` - (Optional) The catalog under which the step is displayed in the actions menu. Must be one of `StepMenuCatalog.elasticsearch`, `StepMenuCatalog.external`, `StepMenuCatalog.ai`, or `StepMenuCatalog.kibana`. Defaults to `StepMenuCatalog.kibana` if not provided.

## Usage Example

```yaml
steps:
  - name: set_vars
    type: workflows_step_example.setvar
    with:
      variables:
        myVar: "Hello World"
        count: 42
        enabled: true
  
  - name: use_vars
    type: console.log
    with:
      message: "{{ steps.set_vars.output.variables.myVar }}"
```

## Event-driven trigger and emitEvent

The plugin registers an event-driven trigger `example.customTrigger` and exposes a route to emit events for it. Workflows that subscribe to this trigger in the same space will run when an event is emitted.

You can emit events in two ways: **via the request-scoped client** (from a route, recommended) or **directly** via the start contract when you have a request and space id. This example uses the request-scoped client. For the full guide (both options, naming, approval), see the [Workflows Extensions README — Contributing Event-Driven Triggers](../../src/platform/plugins/shared/workflows_extensions/README.md#contributing-event-driven-triggers).

### Emit an event (request context)

From a route handler, use the request-scoped workflows context (your plugin must depend on `workflows_extensions` and type your HTTP router with `WorkflowsExtensionsRequestHandlerContext` from `@kbn/workflows-extensions/server`, as in `server/plugin.ts`):

```ts
const client = context.workflows.getWorkflowsClient();
await client.emitEvent(CUSTOM_TRIGGER_ID, {
  message: 'Hello',
  source: 'example',
  labels: ['demo', 'alerts'],
});
```

To try it via HTTP (example only; authz disabled for demo):

```bash
curl -X POST -u elastic:changeme -H 'Content-Type: application/json' \
  'http://localhost:5601/api/workflows_extensions_example/emit' \
  -d '{"message":"Hello from example","source":"curl","labels":["demo","curl"]}'
```

The trigger id is `example.customTrigger` (kebab-case namespace, camelCase event). The event payload must match the trigger’s `eventSchema` (`message` required; `source`, `category`, and `labels` optional).

For information about some guardrails in event-driven triggers see [Event-driven guardrails](../../src/platform/plugins/shared/workflows_extensions/dev_docs/TRIGGERS.md#event-driven-guardrails).

## Key Points

1. **Shared Common Fields**: The `id`, `inputSchema`, and `outputSchema` are defined in `common/types.ts` and imported by both server and public implementations to ensure consistency.

2. **Handler Function**: The handler receives validated input and the step execution runtime context, and returns output conforming to the output schema.

3. **Metadata Registration**: The public plugin registers UI metadata that helps users understand and use the step in the workflow editor.

