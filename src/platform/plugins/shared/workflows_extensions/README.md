# Workflows Extensions Plugin

Extension point registry for workflow extensions. This plugin provides a centralized location for registering custom workflow extensions, including step types.

## Overview

The `workflows_extensions` plugin serves as the home for workflow extension points. It provides:

- **Step Type Registry**: Allows other plugins to register custom workflow steps with both server-side execution logic and client-side UI definition
- **Trigger Registry**: Allows other plugins to register event-driven triggers (id + event payload schema) and emit events so workflows can subscribe and run when those events occur

External teams must implement steps and triggers in their own plugins and register via the plugin contract; see [Custom step types](dev_docs/STEPS.md#important-internal-vs-external-steps) and [Event-driven triggers](dev_docs/TRIGGERS.md) for details.

To analyze **usage telemetry** for your step/trigger ids (e.g. filter by `cases.*`) on Elastic’s behavioral telemetry cluster, see [Telemetry dashboard: workflows extensions usage](dev_docs/telemetry_dashboard_workflows_extensions.md).

## Step Type Registry Architecture

The step type registry provides a clean separation between:

- **Server-side registry**: Stores step execution handler (behavioral implementation)
- **Public-side registry**: Stores UI definition (labels, descriptions, icons)

This separation ensures that:

- Execution logic remains on the server
- UI definition is available directly to client-side code without HTTP requests
- Type safety is maintained between server and client registries via step type IDs

**Async registration (public only):** The public step registry accepts either a definition or a **loader function** `() => Promise<PublicStepDefinition>`. Using a loader (e.g. `() => import('./my_step').then(m => m.myStepDefinition)`) allows step modules—and heavy dependencies like zod—to be loaded asynchronously, keeping them out of your plugin’s main bundle. The registry resolves loaders in the background; the workflows app awaits `workflowsExtensions.isReady()` before rendering so definitions are ready when needed.

## Trigger Registry Architecture

The trigger registry follows the same pattern as steps:

- **Server-side registry**: Stores trigger definitions (id + `eventSchema` for payload validation). Other plugins register during `setup()`.
- **Public-side registry**: Stores UI definition (title, description, icon, documentation, snippets) so the workflows UI can display triggers and help users subscribe.

**Async registration (public only):** The public trigger registry accepts either a definition or a **loader function** `() => Promise<PublicTriggerDefinition>`. Using a loader (e.g. `() => import('./my_trigger').then(m => m.myTriggerDefinition)`) keeps trigger modules and heavy deps out of your plugin's main bundle. Loaders are resolved in the background; `workflowsExtensions.isReady()` waits for both step and trigger loaders before the workflows UI renders.

To run workflows when something happens, your plugin calls **emitEvent** (via the request-scoped client or the start contract). The platform validates the payload against the trigger's `eventSchema`, then invokes the registered trigger event handler (e.g. `workflows_management`), which finds subscribed workflows and runs them in the request's space.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Other Plugins                                   │
│  ┌────────────────────────┐         ┌────────────────────────┐          │
│  │  Server Setup          │         │  Public Setup          │          │
│  │  registerStep()        │         │  registerStep()        │          │
│  │  registerTriggerDef()  │         │  registerTriggerDef()  │          │
│  └────────────────────────┘         └────────────────────────┘          │
│  ┌────────────────────────┐                                             │
│  │  Runtime: emitEvent()  │  (when something happens)                   │
│  └────────────────────────┘                                             │
└────────────────────┬──────────────────┬────────────────┬────────────────┘
                     │                  │                │
                     ▼                  ▼                ▼
         ┌───────────────────┐  ┌──────────────────┐  ┌─────────────────────┐
         │  Server Registry  │  │  Public Registry │  │  Trigger event      │
         │  Step handlers    │  │  Step/Trigger    │  │  handler            │
         │  Trigger defs     │  │  UI definitions  │  │  (e.g. workflows_   │
         │  (id+eventSchema) │  │                  │  │   management)       │
         └─────────┬─────────┘  └─────────┬────────┘  └──────────┬──────────┘
                   │                      │                      │
                   │                      │                      │
         ┌─────────▼──────────┐  ┌────────▼──────────┐  ┌────────▼───────────┐
         │ Execution Engine   │  │ Workflows UI      │  │ Resolve subscribed │
         │ (Uses step         │  │ (Uses step/trigger│  │ workflows, run     │
         │  handlers)         │  │  definitions)     │  │ via engine         │
         └────────────────────┘  └───────────────────┘  └────────────────────┘
```

**Event-driven flow:** When a plugin calls `emitEvent(triggerId, payload)`, the trigger event handler (e.g. `workflows_management`) validates the payload, resolves workflows subscribed to that trigger in the space, and runs them via the Execution Engine.

## Contributions

- **[Custom step types](dev_docs/STEPS.md)** — Contributing custom steps, step type requirements, and the step definition approval process
- **[Event-driven triggers](dev_docs/TRIGGERS.md)** — Contributing triggers, emitting events, and the trigger definition approval process

## Dependencies

- **Server**: No required dependencies
- **Public**: Requires `@elastic/eui` for icon components

## Integration

The `workflows_extensions` plugin is automatically integrated with:

- `workflows_execution_engine`: Uses server registry to resolve custom steps during workflow execution
- `workflows_management`: Uses public registry to display step definitions in the UI

No additional configuration is required.
