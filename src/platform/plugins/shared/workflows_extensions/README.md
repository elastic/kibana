# Workflows Extensions Plugin

Extension point registry for workflow extensions. This plugin provides a centralized location for registering custom workflow extensions, including step types.

## Overview

The `workflows_extensions` plugin serves as the home for workflow extension points. Currently, it provides:

- **Step Type Registry**: Allows other plugins to register custom workflow steps with both server-side execution logic and client-side UI definition

Future extension points (such as triggers) will also be registered through this plugin.

## Important: Internal vs External Steps

**⚠️ IMPORTANT CONVENTION**: The `workflows_extensions` plugin contains **internal, workflows-team owned** step implementations only. These are located in:
- `server/steps/` - Internal server-side step handlers
- `public/steps/` - Internal public-side step definitions

**External teams should NOT implement custom steps inside the `workflows_extensions` plugin.** Instead, external teams must:

1. **Create steps in their own plugin** - Steps should be implemented in a plugin owned and maintained by the team that will maintain the step
2. **Register via plugin contract** - Use the `workflows_extensions` plugin contract to register steps from your external plugin, just like the example in `examples/workflows_extensions_example/README.md`

This separation ensures:
- Clear ownership boundaries
- Proper maintenance responsibilities
- Better code organization
- Reduced coupling between teams

See the [Contributing Custom Step Types](#contributing-custom-step-types) section below for the correct way to implement external steps.

### Step Type Registry Architecture

The step type registry provides a clean separation between:

- **Server-side registry**: Stores step execution handler (behavioral implementation)
- **Public-side registry**: Stores UI definition (labels, descriptions, icons)

This separation ensures that:

- Execution logic remains on the server
- UI definition is available directly to client-side code without HTTP requests
- Type safety is maintained between server and client registries via step type IDs

## Architecture

```
┌───────────────────────────────────────────────────────────┐
│                    Other Plugins                          │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │  Server Setup    │         │  Public Setup    │        │
│  │  registerStep()  │         │  registerStep()  │        │
│  └──────────────────┘         └──────────────────┘        │
└────────────────────┬──────────────────┬───────────────────┘
                     │                  │
                     ▼                  ▼
         ┌───────────────────┐  ┌──────────────────┐
         │  Server Registry  │  │  Public Registry │
         │  (Step handlers)  │  │  (UI Definition) │
         └─────────┬─────────┘  └─────────┬────────┘
                   │                      │
                   │                      │
         ┌─────────▼──────────┐  ┌────────▼──────────┐
         │ Execution Engine   │  │  Workflows UI     │
         │  (Uses handlers)   │  │ (Uses definition) │
         └────────────────────┘  └───────────────────┘
```

## Contributing Custom Step Types

This section provides a complete guide for contributors who want to add custom step types to the workflows system.

### Step 1: Define Common Step Definition

Create a shared definition file (e.g., `common/step_types/my_step.ts`) that contains the step ID and schemas:

```typescript
import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';

/**
 * Step type ID for your custom step.
 * Must follow namespaced format: 'pluginName.stepName'
 */
export const MyStepTypeId = 'myPlugin.myCustomStep';

/**
 * Input schema for the step.
 * Defines what parameters the step accepts.
 */
export const InputSchema = z.object({
  message: z.string(),
  count: z.number().optional(),
  mode: z.enum(['partial', 'full'])
});

/**
 * Output schema for the step.
 *
 * Defines the structure and types of data that this step will return.
 * This schema is used for validation and type checking to ensure data consistency
 * across workflow steps.
 */
 * Defines all possible structures the step returns.
 */
export const OutputSchema = z.union([
    z.object({
    result: z.string(),
  }),
  z.object({
    partialResult: z.string(),
  })
]);

export type MyStepInput = z.infer<typeof InputSchema>;
export type MyStepOutput = z.infer<typeof OutputSchema>;

/**
 * Config schema for the step (optional).
 * Defines config properties that appear at the step level (outside the `with` block).
 * Example: `id`.
 */
export const ConfigSchema = z.object({
  'id': z.string(),
});

/**
 * Common step definition shared between server and public.
 */
export const myStepCommonDefinition: CommonStepDefinition = {
  id: MyStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema, // Optional: only needed if step has config properties
};
```

### Step 2: Implement Server-Side Handler

Create the server-side implementation (e.g., `server/step_types/my_step.ts`):

```typescript
import type { ServerStepDefinition, StepHandler } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { myStepCommonDefinition } from '../../common/step_types/my_step';

export const getMyStepDefinition = (coreSetup: CoreSetup) =>
  createServerStepDefinition({
    ...myStepCommonDefinition,
    handler: async (context) => {
      try {
        const [coreStart, depsStart] = await coreSetup.getStartServices();
        const { http } = coreStart;
        const { message, count } = context.input;

        // Access workflow context
        const workflowContext = context.contextManager.getContext();

        // Use the scoped Elasticsearch client if needed
        const esClient = context.contextManager.getScopedEsClient();

        // Log information
        context.logger.info(`Processing step with message: ${message}`);

        // Perform your step logic here
        const result = `Processed: ${message}${count ? ` (count: ${count})` : ''}`;

        return { output: { result } };
      } catch (error) {
        context.logger.error('My step execution failed', error);
        return { error };
      }
    },
  });
```

### Step 3: Implement Public-Side Definition

Create the public-side definition (e.g., `public/step_types/my_step.ts`):

```typescript
import React from 'react';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { i18n } from '@kbn/i18n';
import { MyStepTypeId, myStepCommonDefinition } from '../../common/step_types/my_step';

import { StepMenuCatalog } from '@kbn/workflows-extensions/public';

export const myStepDefinition: PublicStepDefinition = {
  ...myStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/star').then(({ icon }) => ({ default: icon }))
  ),
  label: i18n.translate('myPlugin.myStep.label', {
    defaultMessage: 'My Custom Step',
  }),
  description: i18n.translate('myPlugin.myStep.description', {
    defaultMessage: 'Performs a custom action in workflows',
  }),
  documentation: {
    details: i18n.translate('myPlugin.myStep.documentation.details', {
      defaultMessage: 'This step processes messages and returns results.',
    }),
    examples: [
      `## Basic usage
\`\`\`yaml
- name: process_message
  type: ${MyStepTypeId}
  with:
    message: "Hello World"
\`\`\``,
    ],
  },
  actionsMenuCatalog: StepMenuCatalog.kibana, // Optional: determines which catalog the step appears under in the actions menu
};
```

**Important**: Icons must be custom components or images imported from EUI, not passed as strings. The workflows app does not fully support built-in `EuiIconType` strings (e.g., `'star'`) yet. See [EUI icon consumption guide](https://github.com/elastic/eui/blob/main/wiki/consuming-eui/README.md#failing-icon-imports) for details.

#### Advanced Example with Dynamic Output Schema

For steps that need different output schemas based on input parameters, you can use `dynamicOutputSchema`. This function is evaluated **in the workflows editor UI** to provide real-time schema validation and autocomplete based on the current step configuration. Here's an example of a data transformation step:

```typescript
import React from 'react';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { i18n } from '@kbn/i18n';
import { MyStepTypeId, myStepCommonDefinition } from '../../common/step_types/my_step';

import { StepMenuCatalog } from '@kbn/workflows-extensions/public';

export const myStepDefinition: PublicStepDefinition = {
  ...myStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/star').then(({ icon }) => ({ default: icon }))
  ),
  label: i18n.translate('myPlugin.myStep.label', {
    defaultMessage: 'My Custom Step',
  }),
  description: i18n.translate('myPlugin.myStep.description', {
    defaultMessage: 'Performs a custom action in workflows',
  }),
  documentation: {
    details: i18n.translate('myPlugin.myStep.documentation.details', {
      defaultMessage: 'This step processes messages and returns results.',
    }),
    examples: [
      `## Basic usage
\`\`\`yaml
- name: process_message
  type: ${MyStepTypeId}
  with:
    message: "Hello World"
\`\`\``,
    ],
  },
  actionsMenuCatalog: StepMenuCatalog.kibana, // Optional: determines which catalog the step appears under in the actions menu
  editorHandlers: {
    dynamicSchema: {
      getOutputSchema: ({ input }) => {
        if (input.mode == 'partial') {
          return z.object({
            partialResult: z.string(),
          });
        }

        return z.object({
          result: z.string(),
        });
      },
    },
  },
};
```

### Custom Property Selection

Custom steps can provide property-level selection handlers for both config properties (step-level, outside `with`) and input properties (inside `with`). The selection interface provides a unified API for entity selection that handles:

- **Search**: Autocomplete suggestions when the user types
- **Resolution**: Entity lookup when loading or pasting values
- **Decoration**: Visual feedback and metadata display in the editor

#### Property Handler Structure

Property handlers are defined in the `editorHandlers` object of the public step definition:

```typescript
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';

export const myStepDefinition = createPublicStepDefinition({
  ...myStepCommonDefinition,
  // ... other properties (icon, label, description, documentation)
  editorHandlers: {
    // Handlers for config properties (step-level, outside `with`)
    config: {
      'property.path': {
        selection: {
          search: async (input, context) => { /* ... */ },
          resolve: async (value, context) => { /* ... */ },
          getDetails: async (value, context, option) => { /* ... */ },
        },
      },
    },
    // Handlers for input properties (inside `with`)
    input: {
      property: {
        selection: {
          search: async (input, context) => { /* ... */ },
          resolve: async (value, context) => { /* ... */ },
          getDetails: async (value, context, option) => { /* ... */ },
        },
      },
    },
  },
});
```

**Note**: Property paths support dot notation for nested objects. For example, if your `configSchema` is:

```typescript
z.object({
  agent: z.object({
    id: z.string(),
  }),
});
```

Use `'agent.id'` as the property key in `editorHandlers.config`.

#### Implementing Selection

The `selection` interface provides three functions that work together:

**1. `search`** - Provides autocomplete options when the user types:

```typescript
editorHandlers: {
  config: {
    'agent-id': {
      selection: {
        search: async (input: string, context: SelectionContext) => {
          const agents = await agentService.search(input);
          return agents.map((agent) => ({
            value: agent.id,
            label: agent.name,
            description: agent.description,
            documentation: agent.documentation,
          }));
        },
        // ...
      },
    },
  },
},
```

**2. `resolve`** - Resolves an entity by its value (used on load, paste, etc.):

```typescript
resolve: async (value: string, context: SelectionContext) => {
  const agent = await agentService.get(value);
  if (!agent) {
    return null;
  }
  return {
    value: agent.id,
    label: agent.name,
    description: agent.description,
  };
},
```

**3. `getDetails`** - Provides detailed information for decoration and metadata:

```typescript
getDetails: async (value, context, option) => {
  if (option) {
    return {
      message: `Successfully connected to ${option.label}`,
      links: [
        { text: 'Edit agent', path: `/app/agent-builder/agents/${option.value}` },
        { text: 'Create agent', path: `/app/agent-builder/agents/new` },
        { text: 'Manage agents', path: `/app/agent-builder/agents` },
      ],
    };
  }
  return {
    message: `Agent ID "${value}" not found. Please select an existing agent or create a new one.`,
    links: [
      { text: 'Create agent', path: `/app/agent-builder/agents/new` },
      { text: 'Manage agents', path: `/app/agent-builder/agents` },
    ],
  };
},
```

#### Complete Example

```typescript
editorHandlers: {
  config: {
    'agent-id': {
      selection: {
        search: async (input: string, context: SelectionContext) => {
          const agents = await agentService.search(input);
          return agents.map((agent) => ({
            value: agent.id,
            label: agent.name,
            description: agent.description,
          }));
        },
        resolve: async (value: string, context: SelectionContext) => {
          const agent = await agentService.get(value);
          return agent
            ? {
                value: agent.id,
                label: agent.name,
                description: agent.description,
              }
            : null;
        },
        getDetails: async (
          value: string,
          context: SelectionContext,
          option: SelectionOption | null
        ) => {
          if (option) {
            return {
              message: `✓ Agent connected: ${option.label}`,
              links: [
                { text: 'Edit agent', path: `/agents/${option.value}` },
                { text: 'Manage agents', path: '/agents' },
              ],
            };
          }
          return {
            message: `Agent "${value}" not found`,
            links: [
              { text: 'Create agent', path: '/agents/new' },
              { text: 'Manage agents', path: '/agents' },
            ],
          };
        },
      },
    },
  },
},
```

#### Type Definitions

```typescript
interface SelectionOption {
  /** The value that will be stored in the YAML */
  value: string;
  /** The label displayed in the UI */
  label: string;
  /** Description shown in completion popup or tooltips (optional) */
  description?: string;
  /** Extended documentation shown in side panel (optional) */
  documentation?: string;
}

interface SelectionDetails {
  /** Message to display (e.g., "✓ Agent connected" or "Agent not found") */
  message: string;
  /** Links to related actions (e.g., "Edit agent", "Create agent") */
  links?: Array<{
    /** Link text */
    text: string;
    /** Link path (relative or absolute URL) */
    path: string;
  }>;
}

interface SelectionContext {
  /** The step type ID (e.g., "oneChat.runAgent") */
  stepType: string;
  /** The property scope ("config" or "input") */
  scope: 'config' | 'input';
  /** The property key (e.g., "agent-id") */
  propertyKey: string;
}
```

#### Example Implementation

For a complete working example, see the `external_step` implementation in `examples/workflows_extensions_example`:

- Common definition: `examples/workflows_extensions_example/common/step_types/external_step.ts`
- Public definition with `editorHandlers`: `examples/workflows_extensions_example/public/step_types/external_step.ts`

#### Performance Considerations

The selection interface includes built-in caching for resolved entities to optimize performance:

- Resolved entities are cached for 30 seconds to avoid redundant API calls
- The `resolve` function is only called when needed (on load, paste, or when validation is triggered), and if the value is valid against the schema.
- The `search` function is called lazily when the user triggers autocomplete

### Step 4: Register in Plugin Setup

Register the step definitions in both server and public plugin setup:

**Server-side** (`server/plugin.ts`):

```typescript
import type { Plugin, CoreSetup, CoreStart } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { myStepDefinition } from './workflows/step_types/my_step';
import { getMyStepWithDepsDefinition } from './workflows/step_types/my_step_with_deps';

export interface MyPluginServerSetupDeps {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
}

export class MyPlugin implements Plugin {
  public setup(core: CoreSetup, plugins: MyPluginServerSetupDeps) {
    // Create the step definition passing the necessary dependencies to factory function
    const stepDefinition = getMyStepDefinition(core);

    // Register server-side step definition using its factory function result
    plugins.workflowsExtensions.registerStepDefinition(stepDefinition);
  }
}
```

**Public-side** (`public/plugin.ts`):

```typescript
import type { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { myStepDefinition } from './workflows/step_types/my_step';

export interface MyPluginPublicSetupDeps {
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup;
}

export class MyPlugin implements Plugin {
  public setup(_core: CoreSetup, plugins: MyPluginPublicSetupDeps) {
    // Register public-side step definitions
    plugins.workflowsExtensions.registerStepDefinition(myStepDefinition);
  }
}
```

### Step 5: Get Approval

All custom step definitions must be approved by the workflows-eng team. See the [Step Definition Approval Process](#step-definition-approval-process) section below.

### Example Implementation

See `examples/workflows_extensions_example` for a complete working example of a custom step type implementation.

## Using Step Definitions

### Client-Side: Accessing Step Definitions

In your UI components:

```typescript
import { useKibana } from '@kbn/kibana-react-plugin/public';

function MyComponent() {
  const { workflowsExtensions } = useKibana().services;

  // Get all registered steps
  const allSteps = workflowsExtensions.getAllStepDefinitions();

  // Get definition for a specific step
  const stepDefinition = workflowsExtensions.getStepDefinition('myPlugin.myCustomStep');
  if (stepDefinition) {
    console.log(stepDefinition.label); // "My Custom Step"
    console.log(stepDefinition.icon); // React component
  }

  // Check if a step is registered
  if (workflowsExtensions.hasStepDefinition('myPlugin.myCustomStep')) {
    // Step is available
  }
}
```

## Step Type Requirements

### Step Type IDs

Step type IDs must follow a namespaced format to avoid conflicts:

- ✅ Good: `"myPlugin.myStep"`, `"custom.feature.step"`
- ❌ Bad: `"myStep"`, `"step"` (too generic)

### Config vs Inputs: Mental Model

When designing a step, you need to decide which parameters should be **config** properties (step-level in YAML) and which should be **inputs** (in the `with` section). Here's the recommended mental model:

**Config (step-level properties):**
Use config to **control step behavior** - how/when/who the step executes:

- Execution context (e.g., `connector-id: 'slack-webhook'`, `agent-id: 'agent-123'`)
- Execution mode (e.g., `mode: 'batch'`, `strategy: 'parallel'`)

**Built-in step-level config examples:**

- `if`: Conditional execution (e.g., `if: '${{ steps.check.output.passed }}'`)
- `foreach`: Iteration over collections (e.g., `foreach: '${{ steps.list.output.items }}'`)
- `on-failure`: Error handling policy with `continue`, `retry`, or `fallback` strategies
- `timeout`: Execution time limits (e.g., `timeout: 30s`)

**Inputs (the `with` section):**
Use inputs for **what/where to process** - the step's payload:

- Target destinations (e.g., `index`, `channel`, `namespace`, `bucket`)
- Data to process (e.g., `document`, `message`, `query`, `payload`)
- Processing parameters (e.g., `severity`, `priority`, `format`, `options`)
- Dynamic values from previous steps or context

**Example:**

```yaml
# Config properties (step-level) - Control step behavior
- name: send_notification
  type: myPlugin.sendNotification
  connector-id: slack-webhook # Config: which connector to use (controls behavior)
  mode: async # Config: execution mode (controls behavior)
  timeout: 10s # Config: time limit (controls behavior)
  # Inputs (with section) - What/Where to process
  with:
    channel: '#alerts' # Input: WHERE - target destination
    message: ${{ steps.process.output.alert }} # Input: WHAT - data to send
    priority: high # Input: WHAT - processing parameter

- name: process_data
  type: myPlugin.processData
  if: steps.previous.output.data.length > 10 # Config: by which condition to run this step (control behavior)
  agent-id: data-processor-1 # Config: which agent to use (controls behavior)
  strategy: parallel # Config: processing strategy (controls behavior)
  # Inputs (with section) - What/Where to process
  with:
    index: logs-* # Input: WHERE - data source
    query: 'status:error' # Input: WHAT - data to process
    outputIndex: processed-* # Input: WHERE - output destination
    transform: # Input: WHAT - transformation logic
      field: timestamp
      format: iso8601
```

**Note:** This mental model is a guideline, not a strict rule. Teams have flexibility in choosing what makes sense for their specific step types. The key is consistency within your plugin's step definitions.

### Type Safety

The step type ID used in the server registry **must match** the one used in the public registry. TypeScript will help catch mismatches at compile time, but it's critical to use the same string value in both registrations.

### Handler Implementation

Your step handler is a `StepHandler` function that receives a `StepHandlerContext` and returns a `StepHandlerResult`:

```typescript
import type { StepHandler } from '@kbn/workflows-extensions/server';

const myStepHandler: StepHandler = async (context) => {
  // Access validated input
  const { message } = context.input;

  // Access workflow context
  const workflowContext = context.contextManager.getContext();

  // Use scoped Elasticsearch client
  const esClient = context.contextManager.getScopedEsClient();

  // Log information
  context.logger.info('Processing step');

  // Return result or error
  return {
    output: { result: 'success' },
  };
};
```

### Error Handling

Step handlers can return errors in their result, or throw errors directly. The workflow execution engine automatically catches thrown errors and converts them to `ExecutionError`, so you don't need to handle conversion manually.

However, if you need to throw or return an error with a **custom error type** or **additional details** for better debugging and error categorization, you can use the `ExecutionError` class from `@kbn/workflows/server`.

#### Standard Error Handling (No ExecutionError Required)

For most cases, you can simply throw errors or return them. When a raw error is thrown or returned, it will be automatically converted to `ExecutionError` with the following mapping:

- `ExecutionError.type` = `Error.name` (e.g., `'TypeError'`, `'RangeError'`)
- `ExecutionError.message` = `Error.message`
- `ExecutionError.details` = `undefined` (no additional details)

```typescript
import type { StepHandler } from '@kbn/workflows-extensions/server';

const myStepHandler: StepHandler = async (context) => {
  // Option 1: Let errors propagate (recommended for simplicity)
  const result = await someOperation(); // Throws on error - automatically caught
  return { output: { result } };

  // Option 2: Catch and return errors explicitly
  try {
    const result = await someOperation();
    return { output: { result } };
  } catch (error) {
    context.logger.error('Step execution failed', error);
    // Standard errors are automatically converted to ExecutionError
    return { error };
  }
};
```

#### Custom Errors with Type and Details

Use `ExecutionError` when you need to provide structured error information with custom types and additional context. You can either throw it or return it:

```typescript
import { ExecutionError } from '@kbn/workflows/server';

const myStepHandler: StepHandler = async (context) => {
  const { userId, action } = context.input;

  // Option 1: Throw ExecutionError (recommended for validation errors)
  if (!userId) {
    throw new ExecutionError({
      type: 'ValidationError',
      message: 'User ID is required',
      details: {
        field: 'userId',
        providedValue: userId,
      },
    });
  }

  // Option 2: Return ExecutionError in result
  const user = await fetchUser(userId);
  if (!user.hasPermission(action)) {
    return {
      error: new ExecutionError({
        type: 'PermissionError',
        message: `User ${userId} does not have permission to perform ${action}`,
        details: {
          userId,
          action,
          userPermissions: user.permissions,
          requiredPermission: action,
        },
      }),
    };
  }

  // Proceed with step logic
  const result = await performAction(user, action);
  return { output: { result } };
};
```

You can also wrap standard errors with additional context:

```typescript
const myStepHandler: StepHandler = async (context) => {
  const { userId, action } = context.input;

  try {
    const user = await fetchUser(userId);
    const result = await performAction(user, action);
    return { output: { result } };
  } catch (error) {
    context.logger.error('Failed to process user action', error);

    // If already an ExecutionError, re-throw or return it
    if (error instanceof ExecutionError) {
      throw error; // or: return { error };
    }

    // Wrap standard errors with additional context
    throw new ExecutionError({
      type: 'ProcessingError',
      message: `Failed to process action for user ${userId}`,
      details: {
        userId,
        action,
        originalError: error instanceof Error ? error.message : String(error),
      },
    });
  }
};
```

#### ExecutionError Properties

The `ExecutionError` class supports the following properties:

- **`type`** (required): A string identifying the error category (e.g., `'ValidationError'`, `'PermissionError'`, `'NetworkError'`)
- **`message`** (required): A human-readable error message describing what went wrong
- **`details`** (optional): An object containing additional context about the error (e.g., field names, user IDs, failed values)

#### When to Use ExecutionError

- ✅ **DO** use `ExecutionError` when you need custom error types (e.g., `'ValidationError'`, `'PermissionError'`)
- ✅ **DO** use `ExecutionError` when you need to include additional error context in the `details` object
- ✅ **DO** use `ExecutionError` for categorizing errors in a structured way
- ✅ **DO** provide meaningful `type` values that help identify the error category
- ✅ **DO** include relevant context in the `details` object for debugging
- ⛔ **DON'T** use `ExecutionError` for standard errors that don't need custom types or details (they're converted automatically)
- ⛔ **DON'T** use generic error types like `'Error'` when a more specific type applies

### Step Handler Context

The `context` parameter provides access to runtime services and step information:

- **`context.input`**: Validated input (type inferred from `inputSchema`)
- **`context.contextManager`**: Access to workflow state and services:
  - `getContext()`: Full workflow context
  - `getScopedEsClient()`: Scoped Elasticsearch client
  - `renderInputTemplate()`: Evaluate template strings
  - `getFakeRequest()`: Fake KibanaRequest for other services
- **`context.logger`**: Scoped logger (`debug`, `info`, `warn`, `error`)
- **`context.abortSignal`**: AbortSignal for cancellation support
- **`context.stepId`**: Current step instance identifier
- **`context.stepType`**: Step type identifier (e.g., `'myPlugin.myCustomStep'`)

### Public-Side Definition Requirements

The public definition must include:

- `id`: Step type identifier (must match server-side)
- `label`: User-facing label (i18n recommended)
- `inputSchema`: Zod schema for input validation
- `outputSchema`: Zod schema for output validation
- `configSchema`: (Optional) Zod schema for config properties (properties outside the `with` block)
- `icon`: (Optional) React component (can be imported from EUI assets, not a direct string), preferably lazy loaded using `React.lazy`.
- `description`: (Optional) user-facing description
- `documentation`: (Optional) documentation with details and examples
- `actionsMenuCatalog`: (Optional) The catalog under which the step is displayed in the actions menu. Must be one of `StepMenuCatalog.elasticsearch`, `StepMenuCatalog.external`, `StepMenuCatalog.ai`, or `StepMenuCatalog.kibana`. Defaults to `StepMenuCatalog.kibana` if not provided.
- `editorHandlers`: (Optional) Property handlers for custom completion and validation. See [Custom Property Completion and Validation](#custom-property-completion-and-validation) for details.
  - `config`: Handlers for config properties (step-level, outside `with`)
  - `input`: Handlers for input properties (inside `with`)
  - `dynamicSchema`: Dynamic schema handlers (e.g., `getOutputSchema`)

## Dependencies

- **Server**: No required dependencies
- **Public**: Requires `@elastic/eui` for icon components

## Integration

The `workflows_extensions` plugin is automatically integrated with:

- `workflows_execution_engine`: Uses server registry to resolve custom steps during workflow execution
- `workflows_management`: Uses public registry to display step definitions in the UI

No additional configuration is required.

## Step Definition Approval Process

All custom step definitions must be approved by the workflows-eng team before being merged. This is enforced through a Scout API test that validates registered steps against an approved list.

### How It Works

1. **Registration Detection**: When you register a new step or modify an existing step's handler, the test will detect it during CI runs.

2. **Handler Hash**: The test generates a SHA256 hash of each step's handler function implementation. This ensures that:

   - New steps are detected
   - Changes to handler implementations are detected (even if the step ID remains the same)

3. **Approval Required**: The test compares registered steps against the approved list in:
   ```
   test/scout/api/fixtures/approved_step_definitions.ts
   ```

### Adding a New Step

When registering a new step, you must:

1. **Run the test locally** to get the step ID and handler hash:

   ```bash
   node scripts/scout.js run-tests --arch stateful --domain classic \
     --config src/platform/plugins/shared/workflows_extensions/test/scout/api/playwright.config.ts
   ```

2. **Add the step to the approved list** in `test/scout/api/fixtures/approved_step_definitions.ts`:

   ```typescript
   export const APPROVED_STEP_DEFINITIONS: Array<{ id: string; handlerHash: string }> = [
     {
       id: 'myPlugin.myCustomStep',
       handlerHash: 'abc123...', // SHA256 hash from test output
     },
   ];
   ```

3. **Get approval** from the workflows-eng team (via PR review)

4. **Update the test** to include your new step in the approved list

### Modifying an Existing Step Handler

If you modify a step's handler implementation:

1. The handler hash will change
2. The test will fail until you update the hash in `approved_step_definitions.ts`
3. You must get re-approval from the workflows-eng team

### Running the Approval Test

To run the test locally:

```bash
# Start servers and run tests
node scripts/scout.js run-tests --arch stateful --domain classic --config src/platform/plugins/shared/workflows_extensions/test/scout/api/playwright.config.ts

# Or start servers separately, then run tests
node scripts/scout.js start-server --arch stateful --domain classic
npx playwright test --config src/platform/plugins/shared/workflows_extensions/test/scout/api/playwright.config.ts --project local
```

The test will fail with a clear error message indicating which steps need to be added or updated in the approved list.
