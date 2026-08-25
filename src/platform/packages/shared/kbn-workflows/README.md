# @kbn/workflows

Common types, utilities, and constants for the Workflows platform feature.

This package contains shared code used by both the workflows execution engine and workflows management plugins. It provides the foundational types, schemas, and utilities needed for workflow operations across the platform.

## Overview

The `@kbn/workflows` package serves as the common foundation for all workflow-related functionality in Kibana. It includes:

- **Type Definitions**: Core TypeScript interfaces and types
- **Workflow Specifications**: Schema definitions for workflow structure
- **Utilities**: Helper functions and validation logic
- **Constants**: Feature flags and configuration constants

## Feature Flags

This package exports feature flag constants that control workflow functionality:

```typescript
import { 
  WORKFLOWS_UI_SETTING_ID 
} from '@kbn/workflows';
```

### Available Feature Flags

- `WORKFLOWS_UI_SETTING_ID` (`workflows:ui:enabled`): Controls the workflows management UI

## Types

### Core Types

The package exports essential workflow types:

```typescript
import type { 
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowSpec,
  WorkflowStepType,
  WorkflowStepDefinition
} from '@kbn/workflows';
```

### Workflow Definition
Represents the structure and configuration of a workflow:

```typescript
interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStepDefinition[];
  triggers?: WorkflowTrigger[];
  variables?: Record<string, any>;
}
```

### Workflow Execution
Represents a runtime instance of a workflow:

```typescript
interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  createdAt: string;
  completedAt?: string;
  context: Record<string, any>;
  steps: StepExecution[];
}
```

## Workflow Specification

The package includes comprehensive schema definitions for workflow structure:

- **Step Types**: Different types of workflow steps (action, condition, loop, etc.)
- **Validation**: Schema validation for workflow definitions
- **YAML Schema**: Generate YAML schema for workflow files

## Usage

### In Plugins

Workflow plugins use this package for shared functionality:

```typescript
// In workflows execution engine
import { WorkflowDefinition } from '@kbn/workflows';

// In workflows management
import { WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows/common/constants';
```

### Type Safety

The package ensures type safety across all workflow operations:

```typescript
import type { WorkflowDefinition } from '@kbn/workflows';

function processWorkflow(workflow: WorkflowDefinition) {
  // TypeScript ensures proper workflow structure
  const { id, name, steps } = workflow;
  // ...
}
```

## Architecture

The package is organized into several key areas:

- **`types/`**: Core TypeScript type definitions
- **`spec/`**: Workflow specification and schema
- **`common/`**: Shared constants and utilities

## Validation

The package provides validation utilities for workflow definitions:

```typescript
import { validateWorkflowDefinition } from '@kbn/workflows';

const isValid = validateWorkflowDefinition(workflowDef);
```

## Schema Generation

Generate YAML schemas for workflow files:

```typescript
import { generateYamlSchema } from '@kbn/workflows';

const schema = generateYamlSchema();
```

This enables IDE support and validation for workflow YAML files.

## Development

When extending workflow functionality:

1. Add new types to the appropriate type definition files
2. Update schemas to reflect new workflow capabilities
3. Export new functionality from the main index file
4. Ensure backward compatibility with existing workflows

## Dependencies

This package has minimal dependencies to ensure it can be used across different contexts:

- Core Kibana types for integration
- Schema validation libraries
- Utility libraries for common operations 