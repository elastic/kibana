# @kbn/workflows-ui

Shared React hooks and UI components for workflows functionality.

## Hooks

### `useWorkflows`

Hook to search and fetch workflows.

```tsx
import { useWorkflows } from '@kbn/workflows-ui';
import type { WorkflowsSearchParams } from '@kbn/workflows';

const params: WorkflowsSearchParams = { size: 20, page: 1 };
const { data, isLoading, error } = useWorkflows(params);
```

## Components

### `WorkflowSelector`

A selectable dropdown component for choosing workflows with search, filtering, and validation support.

```tsx
import { WorkflowSelector } from '@kbn/workflows-ui';
import type { WorkflowSelectorConfig } from '@kbn/workflows-ui';

const config: WorkflowSelectorConfig = {
  label: 'Select Workflow',
  placeholder: 'Choose a workflow...',
  filterFunction: (workflows) => workflows.filter(w => w.enabled),
  sortFunction: (workflows) => workflows.sort((a, b) => a.name.localeCompare(b.name)),
};

<WorkflowSelector
  selectedWorkflowId={workflowId}
  onWorkflowChange={(id) => setWorkflowId(id)}
  config={config}
  error={error}
  onCreateWorkflow={() => navigateToCreate()}
/>
```

### `RunWorkflowPanel`

A panel that lets a host plugin select and run a workflow with caller-provided inputs. Render it
within Kibana's React context so it can use the application, notification, and rendering services.

```tsx
import { RunWorkflowPanel } from '@kbn/workflows-ui';

<RunWorkflowPanel
  inputs={{ caseId }}
  onClose={() => closePopover()}
  onExecute={() => trackWorkflowRun()}
/>
```

Use `visibility` to request managed workflows for a selector or solution. The optional
`filterWorkflow` and `sortWorkflow` callbacks can further tailor the displayed workflows.

## Dependencies

- `@kbn/workflows` - For workflow types and utilities
- `@kbn/react-query` - For data fetching
- `@kbn/kibana-react-plugin` - For Kibana services
- `@kbn/react-kibana-context-theme` - For theme support (dark mode)
- `@kbn/i18n` - For internationalization
- `@kbn/i18n-react` - For React i18n components

