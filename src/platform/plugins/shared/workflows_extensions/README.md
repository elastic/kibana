# Workflows Extensions Plugin

Extension point registry for workflow extensions. This plugin provides a centralized location for registering custom workflow extensions, including step types.

## Overview

The `workflows_extensions` plugin serves as the home for workflow extension points. Currently, it provides:

- **Step Type Registry**: Allows other plugins to register custom workflow steps with both server-side execution logic and client-side UI definition

Future extension points (such as triggers) will also be registered through this plugin.

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
});

/**
 * Output schema for the step.
 * Defines what the step returns.
 */
export const OutputSchema = z.object({
  result: z.string(),
});

export type MyStepInput = z.infer<typeof InputSchema>;
export type MyStepOutput = z.infer<typeof OutputSchema>;

/**
 * Common step definition shared between server and public.
 */
export const myStepCommonDefinition: CommonStepDefinition = {
  id: MyStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
```

### Step 2: Implement Server-Side Handler

Create the server-side implementation (e.g., `server/step_types/my_step.ts`):

```typescript
import type { ServerStepDefinition, StepHandler } from '@kbn/workflows-extensions/server';
import { myStepCommonDefinition } from '../../common/step_types/my_step';

// Handler function that executes the step logic
const myStepHandler: StepHandler = async (context) => {
  try {
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
};

export const myStepDefinition: ServerStepDefinition = {
  ...myStepCommonDefinition,
  handler: myStepHandler,
};
```

### Step 3: Implement Public-Side Definition

Create the public-side definition (e.g., `public/step_types/my_step.ts`):

```typescript
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { icon as starIcon } from '@elastic/eui/es/components/icon/assets/star';
import { i18n } from '@kbn/i18n';
import { MyStepTypeId, myStepCommonDefinition } from '../../common/step_types/my_step';

export const myStepDefinition: PublicStepDefinition = {
  ...myStepCommonDefinition,
  icon: starIcon, // Must import icon from EUI, not use string
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
};
```

**Important**: Icons must be custom components or images imported from EUI, not passed as strings. The workflows app does not fully support built-in `EuiIconType` strings (e.g., `'star'`) yet. See [EUI icon consumption guide](https://github.com/elastic/eui/blob/main/wiki/consuming-eui/README.md#failing-icon-imports) for details.

### Step 4: Register in Plugin Setup

Register the step definitions in both server and public plugin setup:

**Server-side** (`server/plugin.ts`):

```typescript
import type { Plugin, CoreSetup, CoreStart } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { myStepDefinition } from './workflows/step_types/my_step';

export interface MyPluginServerSetupDeps {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
}

export class MyPlugin implements Plugin {
  public setup(_core: CoreSetup, plugins: MyPluginServerSetupDeps) {
    // Register server-side step definitions
    plugins.workflowsExtensions.registerStepDefinition(myStepDefinition);
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

### Public-Side Definition Requirements

The public definition must include:

- `id`: Step type identifier (must match server-side)
- `inputSchema`: Zod schema for input validation
- `outputSchema`: Zod schema for output validation
- `label`: User-facing label (i18n recommended)
- `icon`: React component (can be imported from EUI, not a string)
- `description`: Optional user-facing description
- `documentation`: Optional documentation with details and examples

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
   node scripts/scout.js run-tests --stateful \
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
node scripts/scout.js run-tests --stateful --config src/platform/plugins/shared/workflows_extensions/test/scout/api/playwright.config.ts

# Or start servers separately, then run tests
node scripts/scout.js start-server --stateful
npx playwright test --config src/platform/plugins/shared/workflows_extensions/test/scout/api/playwright.config.ts --project local
```

The test will fail with a clear error message indicating which steps need to be added or updated in the approved list.
