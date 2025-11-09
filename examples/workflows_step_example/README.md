# Workflows Step Example Plugin

This example plugin demonstrates how to register custom workflow step types using the `registerStepType` API. It provides a working implementation of a "setvar" step that allows workflows to define and use variables.

## Overview

The registerStep mechanism allows any Kibana plugin to extend workflows with custom step types. This provides:

- **Extensibility**: Plugins can add domain-specific step types without modifying core workflows code
- **Type Safety**: Zod schemas provide runtime validation and TypeScript types
- **Reusability**: Custom steps can be used across multiple workflows
- **Maintainability**: Clear separation between core engine and custom functionality

## Architecture

### How It Works

1. **Registration (Setup Phase)**: Plugins call `workflowsExecutionEngine.registerStepType()` during their setup phase
2. **Execution (Runtime)**: When a workflow runs, the execution engine checks if a step type is registered
3. **Delegation**: If registered, it delegates execution to the custom step handler
4. **Context Access**: Handlers receive a rich context with access to workflow state, variables, logging, etc.

### Key Components

```
┌─────────────────────────────────────────────────────────────┐
│ Example Plugin (workflowsStepExample)                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ plugin.setup()                                          │ │
│ │   └─> registerStepType(setvarStepDefinition)          │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Workflows Execution Engine Plugin                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ StepTypeRegistry                                        │ │
│ │   ├─> register(definition)                            │ │
│ │   ├─> get(stepType)                                   │ │
│ │   └─> has(stepType)                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ NodesFactory                                            │ │
│ │   └─> if registry.has(stepType)                       │ │
│ │         return CustomStepImpl                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ CustomStepImpl (delegates to handler)                  │ │
│ │   ├─> Validate input with inputSchema                 │ │
│ │   ├─> Call handler(context)                           │ │
│ │   └─> Validate output with outputSchema               │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Example: Set Variable Step

The `setvar` step allows workflows to define variables that can be accessed in subsequent steps.

### Step Definition

```typescript
export const setvarStepDefinition: StepTypeDefinition = {
  id: 'setvar',
  title: 'Set Variable',
  description: 'Define variables accessible throughout the workflow',
  
  inputSchema: z.object({
    variables: z.record(z.string(), z.any())
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    variablesSet: z.array(z.string())
  }),
  
  handler: async (context) => {
    const { variables } = context.input;
    
    for (const [key, value] of Object.entries(variables)) {
      context.contextManager.setVariable(key, value);
    }
    
    return {
      output: {
        success: true,
        variablesSet: Object.keys(variables)
      }
    };
  }
};
```

### Usage in Workflow YAML

```yaml
name: Variable Example Workflow
enabled: true
steps:
  # Set variables
  - name: setVarStep
    type: setvar
    with:
      variables:
        x: 10
        userName: "Alice"
        apiBaseUrl: "https://api.example.com"
        
  # Use variables in subsequent steps
  - name: fetchData
    type: http
    with:
      url: "{{ variables.apiBaseUrl }}/users"
      method: GET
      body:
        count: "{{ variables.x }}"
        name: "{{ variables.userName }}"
        
  - name: processData
    type: http
    with:
      url: "{{ variables.apiBaseUrl }}/process"
      method: POST
      body:
        data: "{{ steps.fetchData.output.data }}"
        multiplier: "{{ variables.x }}"
```

## Creating Your Own Custom Step Type

### 1. Define Your Step Type

Create a file `my_custom_step.ts`:

```typescript
import { z } from '@kbn/zod';
import type { StepTypeDefinition } from '@kbn/workflows';

export const myCustomStepDefinition: StepTypeDefinition = {
  id: 'my_custom_step',
  title: 'My Custom Step',
  description: 'Does something custom',
  
  // Define what inputs your step accepts
  inputSchema: z.object({
    message: z.string(),
    count: z.number().optional().default(1)
  }),
  
  // Define what outputs your step produces
  outputSchema: z.object({
    result: z.string(),
    timestamp: z.string()
  }),
  
  // Optional: custom timeout
  timeout: '5m',
  
  // Implement your step logic
  handler: async (context) => {
    const { message, count } = context.input;
    
    // Access workflow context
    const workflowContext = await context.contextManager.getContext();
    
    // Use logging
    context.logger.info(`Processing message: ${message}`);
    
    // Set variables for later steps
    context.contextManager.setVariable('processedCount', count);
    
    // Do your custom logic here
    const result = `${message} (repeated ${count} times)`;
    
    // Check for cancellation
    if (context.abortSignal.aborted) {
      return {
        error: {
          message: 'Step was cancelled'
        }
      };
    }
    
    return {
      output: {
        result,
        timestamp: new Date().toISOString()
      }
    };
  }
};
```

### 2. Register in Your Plugin

In your plugin's `server/plugin.ts`:

```typescript
import type { WorkflowsExecutionEnginePluginSetup } from '@kbn/workflows-execution-engine-plugin/server';
import { myCustomStepDefinition } from './step_types/my_custom_step';

export interface MyPluginSetupDeps {
  workflowsExecutionEngine: WorkflowsExecutionEnginePluginSetup;
}

export class MyPlugin implements Plugin {
  setup(core, plugins: MyPluginSetupDeps) {
    // Register your custom step type
    plugins.workflowsExecutionEngine.registerStepType(myCustomStepDefinition);
    
    return {};
  }
}
```

### 3. Add to Plugin Dependencies

In your `kibana.jsonc`:

```jsonc
{
  "plugin": {
    "id": "myPlugin",
    "server": true,
    "requiredPlugins": [
      "workflowsExecutionEngine"  // Add this dependency
    ]
  }
}
```

## Handler Context API

The `context` object provided to your handler gives you access to:

### Input & Context

```typescript
// Validated input from the workflow
const { myParam } = context.input;

// Access full workflow context
const workflowContext = await context.contextManager.getContext();
// workflowContext contains: workflow, execution, inputs, steps, variables, etc.

// Evaluate template strings
const evaluated = await context.contextManager.evaluateTemplate('{{ steps.prev.output.data }}');
```

### Variables

```typescript
// Set a variable (accessible as {{ variables.myVar }} in other steps)
context.contextManager.setVariable('myVar', 'value');

// Get a variable
const value = context.contextManager.getVariable('myVar');
```

### Logging

```typescript
context.logger.debug('Debug message', { metadata });
context.logger.info('Info message');
context.logger.warn('Warning message');
context.logger.error('Error message', { error });
```

### Cancellation Support

```typescript
// Check if step was cancelled
if (context.abortSignal.aborted) {
  return { error: { message: 'Cancelled' } };
}

// Listen for cancellation
context.abortSignal.addEventListener('abort', () => {
  // Clean up resources
});
```

### Step Metadata

```typescript
context.stepId;    // Current step's ID
context.stepType;  // Current step's type
```

## Best Practices

### 1. Schema Design

```typescript
// ✅ Use descriptive schemas with defaults
inputSchema: z.object({
  url: z.string().url().describe('API endpoint URL'),
  timeout: z.number().default(30).describe('Request timeout in seconds'),
  retries: z.number().min(0).max(5).default(3)
})

// ❌ Avoid overly permissive schemas
inputSchema: z.object({
  config: z.any()  // Too loose, hard to validate
})
```

### 2. Error Handling

```typescript
handler: async (context) => {
  try {
    // Your logic here
    
    return { output: { ... } };
  } catch (error) {
    context.logger.error('Step failed', { error });
    
    return {
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        details: { /* additional context */ }
      }
    };
  }
}
```

### 3. Validation

```typescript
// Input is automatically validated against inputSchema
// But you can add business logic validation:
handler: async (context) => {
  const { url } = context.input;
  
  // Business rule validation
  if (!url.startsWith('https://')) {
    return {
      error: {
        message: 'Only HTTPS URLs are allowed'
      }
    };
  }
  
  // ... proceed with logic
}
```

### 4. Async Operations

```typescript
handler: async (context) => {
  // Long-running operations should check for cancellation
  for (let i = 0; i < largeDataset.length; i++) {
    if (context.abortSignal.aborted) {
      return { error: { message: 'Cancelled' } };
    }
    
    await processItem(largeDataset[i]);
  }
  
  return { output: { processed: true } };
}
```

## Testing

To test your custom step:

1. **Start Kibana** with your plugin enabled
2. **Create a test workflow** using your custom step type
3. **Execute the workflow** and check the execution logs
4. **Verify** that variables/outputs are accessible in subsequent steps

Example test workflow:

```yaml
name: Test My Custom Step
enabled: true
steps:
  - name: test_custom
    type: my_custom_step
    with:
      message: "Hello World"
      count: 3
      
  - name: verify_output
    type: http
    with:
      url: "https://httpbin.org/post"
      method: POST
      body:
        result: "{{ steps.test_custom.output.result }}"
        timestamp: "{{ steps.test_custom.output.timestamp }}"
```

## Troubleshooting

### Step type not found

**Error**: `Unknown node type: my_step`

**Solution**: Ensure your plugin is loaded and `registerStepType` is called during setup.

### Input validation failed

**Error**: `Input validation failed for step type "my_step"`

**Solution**: Check that your workflow YAML matches the `inputSchema`. Use the Zod error message for details.

### Variables not accessible

**Error**: Variable shows as `undefined` in template expressions

**Solution**: Ensure `setVariable` is called before the step that uses it. Variables are not persisted across workflow executions.

## Advanced Topics

### Accessing Elasticsearch

```typescript
handler: async (context) => {
  const workflowContext = await context.contextManager.getContext();
  const esClient = context.contextManager.getEsClientAsUser();
  
  const result = await esClient.search({
    index: 'my-index',
    body: { query: { match_all: {} } }
  });
  
  return { output: { hits: result.hits.total } };
}
```

### Template Evaluation

```typescript
// Evaluate template strings from config
const url = await context.contextManager.evaluateTemplate(
  '{{ variables.apiBase }}/{{ workflow.id }}'
);
```

## Resources

- **Architecture Decision**: See `register-step-mechanism.plan.md` for the full architectural rationale
- **kbn-workflows Package**: Contains shared types (`StepTypeDefinition`, `StepHandlerContext`)
- **Execution Engine**: `workflowsExecutionEngine` plugin handles the runtime execution

## Questions?

For questions or issues with the registerStep mechanism:

1. Check existing patterns in `x-pack/platform/plugins/shared/actions` (registerType)
2. Review `x-pack/platform/plugins/shared/alerting` (registerType, registerConnectorAdapter)
3. Contact the @elastic/workflows-eng team

