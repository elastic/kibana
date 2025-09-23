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
import { test } from '@kbn/scout';

test('create and manage case workflow', async ({ apiServices }) => {
  const { cases } = apiServices;

  // Create a new case
  const newCase = await cases.create({
    title: 'Security incident investigation',
    description: 'Investigating suspicious activity on user account',
    tags: ['security', 'investigation'],
    severity: 'high',
    assignees: [{ uid: 'user123' }],
    category: 'security',
    customFields: [],
    settings: {
      syncAlerts: true,
    },
  });

  // Get case details
  const caseDetails = await cases.get(newCase.data.id);

  // Update case status and severity (note: version is required)
  await cases.update([
    {
      id: newCase.data.id,
      version: newCase.data.version,
      status: 'in-progress',
      severity: 'critical',
    },
  ]);

  // Search for cases
  const searchResults = await cases.find({
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
import { spaceTest } from '@kbn/scout';

spaceTest('use cases in custom space', async ({ apiServices, scoutSpace }) => {
  const { cases } = apiServices;

  const newCase = await cases.create(
    {
      title: 'Space-specific case',
      description: 'Case in security team space',
      tags: ['team-specific'],
      category: null,
      customFields: [],
    },
    spaceId
  );

  const caseDetails = await cases.get(newCase.data.id, scoutSpace.id);
});

// Working with connectors
test('get available connectors', async ({ apiServices }) => {
  const { cases } = apiServices;

  // Get available case connectors
  const connectors = await cases.connectors.get();

  // Create case with connector if available
  if (connectors.length > 0) {
    const newCase = await cases.create({
      title: 'Case with external integration',
      description: 'This case can be configured with external connectors',
      category: 'integration',
      customFields: [],
      connector: {
        id: connectors[0].id,
        name: connectors[0].name,
        type: connectors[0].connectorTypeId,
        fields: null,
      },
    });
  }
});
```

## API Reference

### Case Management

- `create(params, spaceId?)` - Create a new case
- `get(caseId, spaceId?)` - Get case details
- `update(updates, spaceId?)` - Update one or more cases (requires id and version)
- `delete(caseIds, spaceId?)` - Delete multiple cases by ID array
- `find(searchParams?, spaceId?)` - Search for cases

### Connectors

- `connectors.get(spaceId?)` - Get available case connectors

### Cleanup Utilities

- `cleanup.deleteAllCases(spaceId?)` - Delete all cases in space
- `cleanup.deleteCasesByTags(tags, spaceId?)` - Delete cases with specific tags

## Example Workflows

### Basic Case Management Workflow

```typescript
test('basic case management workflow', async ({ apiServices }) => {
  const { cases } = apiServices;

  // 1. Create case
  const incident = await cases.create({
    title: 'Security Breach - User Account Compromise',
    description: 'Multiple failed login attempts detected',
    severity: 'high',
    tags: ['security', 'breach', 'urgent'],
    assignees: [{ uid: 'security-analyst-1' }],
    category: 'security',
    customFields: [],
  });

  // 2. Update case status
  await cases.update([
    {
      id: incident.data.id,
      version: incident.data.version,
      severity: 'critical',
      status: 'in-progress',
      assignees: [{ uid: 'security-analyst-1' }, { uid: 'security-lead' }],
    },
  ]);

  // 3. Get updated case to get new version
  const updatedCase = await cases.get(incident.data.id);

  // 4. Close case
  await cases.update([
    {
      id: incident.data.id,
      version: updatedCase.data.version,
      status: 'closed',
    },
  ]);
});
```

### Bulk Case Management

```typescript
test('bulk case operations', async ({ apiServices }) => {
  const { cases } = apiServices;

  // Create multiple cases
  const case1 = await cases.create({
    title: 'Case 1',
    description: 'Description 1',
    tags: ['batch-1', 'test'],
    category: null,
    customFields: [],
  });

  const case2 = await cases.create({
    title: 'Case 2',
    description: 'Description 2',
    tags: ['batch-1', 'test'],
    category: null,
    customFields: [],
  });

  // Bulk update multiple cases
  await cases.update([
    {
      id: case1.data.id,
      version: case1.data.version,
      status: 'in-progress',
      assignees: [{ uid: 'analyst-1' }],
    },
    {
      id: case2.data.id,
      version: case2.data.version,
      status: 'in-progress',
      assignees: [{ uid: 'analyst-2' }],
    },
  ]);

  // Search for batch cases
  const batchCases = await cases.find({
    tags: 'batch-1',
    status: 'in-progress',
  });

  // Cleanup by tags
  await cases.cleanup.deleteCasesByTags(['batch-1']);
});
```

## Error Handling

The service leverages kbnClient's robust built-in retry mechanism with enhanced error reporting:

- **Automatic retries**: All operations retry up to 3 times (configurable via `retries` option)
- **Exponential backoff**: Delay increases with each retry attempt (`1000ms * attempt`)
- **Comprehensive error coverage**: Retries on network errors, timeouts, and HTTP error status codes
- **Enhanced error logging**: Detailed error information including status codes, response bodies, and error causes
- **Ignorable errors**: Delete operations ignore 404 errors for idempotent behavior
- **Version validation**: Update operations validate that required `id` and `version` fields are provided

### Enhanced Error Information

The service provides detailed error context when requests fail:

```
KbnClientRequesterError: [POST - http://localhost:5620/api/cases]
request failed (attempt=3/3): ERR_BAD_REQUEST
-- Status: 400, Cause: ERR_BAD_REQUEST, Response: {
  "error": "Bad Request",
  "message": "Invalid value \"undefined\" supplied to \"cases,version\"",
  "statusCode": 400,
  "validation": {
    "source": "payload",
    "keys": ["version"]
  }
} -- and ran out of retries
```

### Common Error Scenarios

```typescript
// Version mismatch error (optimistic concurrency control)
try {
  await cases.update([
    {
      id: caseId,
      version: 'old-version',
      status: 'closed',
    },
  ]);
} catch (error) {
  // Handle version conflict - need to get latest version
  const currentCase = await cases.get(caseId);
  await cases.update([
    {
      id: caseId,
      version: currentCase.data.version,
      status: 'closed',
    },
  ]);
}

// Missing required fields
try {
  await cases.create({
    title: 'Test case',
    // Missing required fields: description, category, customFields
  });
} catch (error) {
  // Error will show which fields are missing in validation details
}
```

## Integration with Other Services

The Cases API service works seamlessly with other Scout API services:

```typescript
test('cases and alerting integration', async ({ apiServices }) => {
  const { cases, alerting } = apiServices;

  // Create alerting rule
  const rule = await alerting.rules.create({
    name: 'Test Rule',
    ruleTypeId: '.es-query',
    consumer: 'alerts',
    params: {
      size: 100,
      thresholdComparator: '>',
      threshold: [0],
      index: ['test-data'],
      timeField: '@timestamp',
      esQuery: '{"query":{"match_all":{}}}',
      timeWindowSize: 5,
      timeWindowUnit: 'm',
    },
    schedule: { interval: '1m' },
  });

  // Create case for investigation
  const caseData = await cases.create({
    title: `Rule Investigation - ${rule.data.name}`,
    description: 'Investigating alerts from test rule',
    tags: ['alerting', 'investigation'],
    category: 'investigation',
    customFields: [],
  });

  // Wait for alerts to be generated
  await alerting.waiting.waitForAlertInIndex('.alerts-observability', rule.data.id);

  // Case can be updated with investigation findings
  await cases.update([
    {
      id: caseData.data.id,
      version: caseData.data.version,
      status: 'in-progress',
    },
  ]);
});
```

## Performance Monitoring

All operations are automatically wrapped with performance measurement using the Scout logger. Performance metrics are logged with operation names like:

- `casesApi.cases.create [case-title]`
- `casesApi.comments.add [case-id]`
- `casesApi.cleanup.deleteAllCases`
