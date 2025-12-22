# Workflows Extensions Example Plugin

This example plugin demonstrates how to register a custom workflow step using the workflows extensions API.

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

## Key Points

1. **Shared Common Fields**: The `id`, `inputSchema`, and `outputSchema` are defined in `common/types.ts` and imported by both server and public implementations to ensure consistency.

2. **Handler Function**: The handler receives validated input and the step execution runtime context, and returns output conforming to the output schema.

3. **Metadata Registration**: The public plugin registers UI metadata that helps users understand and use the step in the workflow editor.

