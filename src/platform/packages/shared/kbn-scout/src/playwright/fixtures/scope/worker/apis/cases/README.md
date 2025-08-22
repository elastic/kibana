# Cases API Service

This service provides a basic interface to interact with Kibana's Cases APIs in Scout tests using Playwright. Cases are used to open and track issues, with support for assignees, tags, severity levels, and external connector integrations.

## Features

- **Space-aware**: All endpoints support Kibana spaces
- **Built-in retry logic**: Uses kbnClient's internal retry mechanism with exponential backoff
- **Performance monitoring**: Automatic performance measurement for all operations
- **Basic coverage**: Includes case management, connectors, and cleanup utilities
- **Robust error handling**: Automatic retry on network errors, timeouts, and HTTP error status codes

## Usage Example

```typescript
import { test } from '@playwright/test';
import { apiServicesFixture } from './path/to/apis';

test.use(apiServicesFixture);

test('create and manage case workflow', async ({ apiServices }) => {
  const { cases } = apiServices;

  // Create a new case
  const newCase = await cases.cases.create({
    title: 'Security incident investigation',
    description: 'Investigating suspicious activity on user account',
    tags: ['security', 'investigation'],
    severity: 'high',
    assignees: [{ uid: 'user123' }],
    settings: {
      syncAlerts: true,
    },
  });

  // Get case details
  const caseDetails = await cases.cases.get(newCase.id);

  // Update case status and severity
  await cases.cases.update([{
    id: newCase.id,
    version: newCase.version,
    status: 'in-progress',
    severity: 'critical',
  }]);

  // Search for cases
  const searchResults = await cases.cases.find({
    tags: 'security',
    status: 'in-progress',
    perPage: 10,
  });

  // Get available connectors
  const connectors = await cases.connectors.get();

  // Cleanup
  await cases.cleanup.deleteAllCases();
});

// Working with spaces
test('use cases in custom space', async ({ apiServices }) => {
  const { cases } = apiServices;
  const spaceId = 'security-team';

  const newCase = await cases.cases.create({
    title: 'Space-specific case',
    description: 'Case in security team space',
    tags: ['team-specific'],
  }, spaceId);

  const caseDetails = await cases.cases.get(newCase.id, spaceId);
});

// Working with connectors
test('get available connectors', async ({ apiServices }) => {
  const { cases } = apiServices;

  // Get available case connectors
  const connectors = await cases.connectors.get();
  
  // Create case with connector if available
  if (connectors.length > 0) {
    const newCase = await cases.cases.create({
      title: 'Case with external integration',
      description: 'This case can be configured with external connectors',
      connector: {
        id: connectors[0].id,
        name: connectors[0].name,
        type: connectors[0].connectorTypeId,
        fields: {},
      },
    });
  }
});
```

## API Reference

### Case Management

- `create(params, spaceId?)` - Create a new case
- `get(caseId, spaceId?)` - Get case details
- `update(updates, spaceId?)` - Update one or more cases
- `delete(caseIds, spaceId?)` - Delete multiple cases
- `find(searchParams?, spaceId?)` - Search for cases

### Connectors

- `connectors.get(spaceId?)` - Get available case connectors

### Cleanup Utilities

- `cleanup.deleteAllCases(spaceId?)` - Delete all cases in space
- `cleanup.deleteCasesByTags(tags, spaceId?)` - Delete cases with specific tags

## Case Properties

### Case Creation Parameters

```typescript
interface CreateCaseParams {
  title: string;                    // Case title (required)
  description: string;              // Case description (required)
  tags?: string[];                  // Optional tags
  severity?: 'low' | 'medium' | 'high' | 'critical';  // Default: 'low'
  assignees?: Array<{ uid: string }>; // Assigned users
  connector?: {                     // External connector configuration
    id: string;
    name: string;
    type: string;
    fields: Record<string, any>;
  };
  settings?: {
    syncAlerts: boolean;            // Auto-sync alerts (default: true)
  };
  owner?: string;                   // Case owner (default: 'cases')
  category?: string;                // Case category
}
```

### Case Status Values

- `open` - Case is open and active
- `in-progress` - Case is being worked on
- `closed` - Case is resolved/closed



## Example Workflows

### Basic Case Management Workflow

```typescript
test('basic case management workflow', async ({ apiServices }) => {
  const { cases } = apiServices;

  // 1. Create case
  const incident = await cases.cases.create({
    title: 'Security Breach - User Account Compromise',
    description: 'Multiple failed login attempts detected',
    severity: 'high',
    tags: ['security', 'breach', 'urgent'],
    assignees: [{ uid: 'security-analyst-1' }],
  });

  // 2. Update case status
  await cases.cases.update([{
    id: incident.id,
    version: incident.version,
    severity: 'critical',
    status: 'in-progress',
    assignees: [
      { uid: 'security-analyst-1' },
      { uid: 'security-lead' }
    ],
  }]);

  // 3. Close case
  await cases.cases.update([{
    id: incident.id,
    version: incident.version,
    status: 'closed',
  }]);
});

### Bulk Case Management

```typescript
test('bulk case operations', async ({ apiServices }) => {
  const { cases } = apiServices;

  // Create multiple cases
  const cases1 = await cases.cases.create({
    title: 'Case 1',
    description: 'Description 1',
    tags: ['batch-1', 'test'],
  });

  const cases2 = await cases.cases.create({
    title: 'Case 2', 
    description: 'Description 2',
    tags: ['batch-1', 'test'],
  });

  // Bulk update multiple cases
  await cases.cases.update([
    {
      id: cases1.id,
      version: cases1.version,
      status: 'in-progress',
      assignees: [{ uid: 'analyst-1' }],
    },
    {
      id: cases2.id,
      version: cases2.version,
      status: 'in-progress', 
      assignees: [{ uid: 'analyst-2' }],
    },
  ]);

  // Search for batch cases
  const batchCases = await cases.cases.find({
    tags: 'batch-1',
    status: 'in-progress',
  });

  // Cleanup by tags
  await cases.cleanup.deleteCasesByTags(['batch-1']);
});
```

## Error Handling

The service leverages kbnClient's robust built-in retry mechanism:

- **Automatic retries**: All operations retry up to 3 times
- **Exponential backoff**: Delay increases with each retry attempt
- **Comprehensive error coverage**: Retries on network errors, timeouts, and HTTP error status codes
- **Ignorable errors**: Delete operations ignore 404 errors for idempotent behavior

## Integration with Other Services

The Cases API service works seamlessly with other Scout API services:

```typescript
test('cases and alerting integration', async ({ apiServices }) => {
  const { cases, alerting } = apiServices;

  // Create alerting rule
  const rule = await alerting.rules.create({
    name: 'Test Rule',
    ruleTypeId: '.es-query',
    // ... rule params
  });

  // Create case for investigation
  const caseData = await cases.cases.create({
    title: 'Rule Investigation',
    description: 'Investigating alerts from test rule',
    tags: ['alerting', 'investigation'],
  });

  // Wait for alerts to be generated
  await alerting.waiting.waitForAlertInIndex('.alerts-observability', rule.id);
  
  // Case can be updated with investigation findings
  await cases.cases.update([{
    id: caseData.id,
    version: caseData.version,
    status: 'in-progress',
  }]);
});
```

## Performance Monitoring

All operations are automatically wrapped with performance measurement using the Scout logger. Performance metrics are logged with operation names like:

- `casesApi.cases.create [case-title]`
- `casesApi.comments.add [case-id]`
- `casesApi.cleanup.deleteAllCases`
