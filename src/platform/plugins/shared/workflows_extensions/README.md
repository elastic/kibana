# Workflows Extensions Plugin

Extension point registry for workflow step types. Allows other plugins to register custom workflow steps with both server-side execution logic and client-side UI metadata.

## Overview

The `workflows_extensions` plugin provides a clean separation between:
- **Server-side registry**: Stores step execution factories (behavioral implementation)
- **Public-side registry**: Stores UI metadata (labels, descriptions, icons)

This separation ensures that:
- Execution logic remains on the server
- UI metadata is available directly to client-side code without HTTP requests
- Type safety is maintained between server and client registries via step type IDs

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Other Plugins                            │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │  Server Setup    │         │  Public Setup    │        │
│  │  registerStep()  │         │  registerStep    │        │
│  │                  │         │  Metadata()      │        │
│  └──────────────────┘         └──────────────────┘        │
└────────────────────┬──────────────────┬───────────────────┘
                     │                  │
                     ▼                  ▼
         ┌──────────────────┐  ┌──────────────────┐
         │  Server Registry  │  │  Public Registry │
         │  (Step Factories) │  │  (UI Metadata)   │
         └─────────┬──────────┘  └─────────┬────────┘
                   │                      │
                   │                      │
         ┌─────────▼──────────┐  ┌────────▼────────┐
         │ Execution Engine   │  │  Workflows UI   │
         │  (Uses factories)  │  │ (Uses metadata) │
         └────────────────────┘  └─────────────────┘
```

## Usage

### Server-Side: Registering a Step Implementation

In your plugin's `server/plugin.ts`:

```typescript
import type { Plugin } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { createStepTypeId } from '@kbn/workflows-extensions';
import type { NodeImplementation } from '@kbn/workflows-execution-engine/server';
import type { StepExecutionRuntime } from '@kbn/workflows-execution-engine/server';

export class MyPlugin implements Plugin {
  public setup(core, plugins) {
    // Register your custom step
    plugins.workflowsExtensions.registerStep({
      id: createStepTypeId('myPlugin.myCustomStep'),
      factory: (stepExecutionRuntime: StepExecutionRuntime): NodeImplementation => {
        // Return your custom NodeImplementation
        return new MyCustomStepImpl(stepExecutionRuntime);
      },
    });
  }
}
```

### Public-Side: Registering Step Metadata

In your plugin's `public/plugin.ts`:

```typescript
import type { Plugin } from '@kbn/core/public';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { createStepTypeId } from '@kbn/workflows-extensions';

export class MyPlugin implements Plugin {
  public setup(core, plugins) {
    // Register UI metadata for your step
    plugins.workflowsExtensions.registerStepMetadata({
      id: createStepTypeId('myPlugin.myCustomStep'),
      label: 'My Custom Step',
      description: 'Performs a custom action in workflows',
      icon: 'star', // EuiIconType
    });
  }
}
```

### Client-Side: Using Step Metadata

In your UI components:

```typescript
import { useKibana } from '@kbn/kibana-react-plugin/public';

function MyComponent() {
  const { workflowsExtensions } = useKibana().services;

  // Get all registered steps
  const allSteps = workflowsExtensions.getRegisteredSteps();

  // Get metadata for a specific step
  const stepMetadata = workflowsExtensions.getStepMetadata('myPlugin.myCustomStep');
  if (stepMetadata) {
    console.log(stepMetadata.label); // "My Custom Step"
    console.log(stepMetadata.icon);   // "star"
  }

  // Check if a step is registered
  if (workflowsExtensions.hasStepMetadata('myPlugin.myCustomStep')) {
    // Step is available
  }
}
```

## Step Type IDs

Step type IDs should follow a namespaced format to avoid conflicts:
- ✅ Good: `"myPlugin.myStep"`, `"custom.feature.step"`
- ❌ Bad: `"myStep"`, `"step"` (too generic)

Use the `createStepTypeId()` helper to create branded step type IDs:

```typescript
import { createStepTypeId } from '@kbn/workflows-extensions';

const stepId = createStepTypeId('myPlugin.myStep');
```

## Type Safety

The step type ID used in the server registry must match the one used in the public registry. TypeScript will help catch mismatches at compile time, but it's important to use the same string value:

```typescript
// Server side
plugins.workflowsExtensions.registerStep({
  id: createStepTypeId('myPlugin.myStep'), // Must match!
  factory: ...,
});

// Public side
plugins.workflowsExtensions.registerStepMetadata({
  id: createStepTypeId('myPlugin.myStep'), // Must match!
  label: 'My Step',
  icon: 'star',
});
```

## Implementation Requirements

### Server-Side Step Factory

Your step factory must return a `NodeImplementation` that implements the `run()` method:

```typescript
import type { NodeImplementation } from '@kbn/workflows-execution-engine/server';
import type { StepExecutionRuntime } from '@kbn/workflows-execution-engine/server';

class MyCustomStepImpl implements NodeImplementation {
  constructor(private stepExecutionRuntime: StepExecutionRuntime) {}

  async run(): Promise<void> {
    // Your step execution logic here
    // Use stepExecutionRuntime to access context, logger, etc.
  }
}
```

### Public-Side Metadata

The metadata must include:
- `id`: Step type identifier (must match server-side)
- `label`: User-facing label
- `icon`: EUI icon type
- `description`: Optional user-facing description

## Dependencies

- **Server**: No required dependencies
- **Public**: Requires `@elastic/eui` for icon types

## Integration

The `workflows_extensions` plugin is automatically integrated with:
- `workflows_execution_engine`: Uses server registry to resolve custom steps
- `workflows_management`: Uses public registry to display step metadata in UI

No additional configuration is required.

