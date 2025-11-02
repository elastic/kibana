# @kbn/workflows-ui

Shared React hooks and UI components for workflows functionality.

## Hooks

### `useWorkflowExecution`

Hook to fetch a single workflow execution by ID.

```tsx
import { useWorkflowExecution } from '@kbn/workflows-ui';

const { data, isLoading, error } = useWorkflowExecution(executionId);
```

### `useWorkflows`

Hook to search and fetch workflows.

```tsx
import { useWorkflows } from '@kbn/workflows-ui';
import type { WorkflowsSearchParams } from '@kbn/workflows';

const params: WorkflowsSearchParams = { limit: 20, page: 1 };
const { data, isLoading, error } = useWorkflows(params);
```

### `useWorkflowExecutionPolling`

Hook to poll a workflow execution until it reaches a terminal state.

```tsx
import { useWorkflowExecutionPolling } from '@kbn/workflows-ui';

const { workflowExecution, isLoading, error } = useWorkflowExecutionPolling(executionId);
```

## Dependencies

- `@kbn/workflows` - For workflow types and utilities
- `@kbn/react-query` - For data fetching
- `@kbn/kibana-react-plugin` - For Kibana services

