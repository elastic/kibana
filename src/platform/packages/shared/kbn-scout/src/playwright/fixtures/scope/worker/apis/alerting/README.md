# Alerting API Service

This service provides a comprehensive interface to interact with Kibana's Alerting APIs in Scout tests using Playwright.

## Features

- **Space-aware**: All endpoints support Kibana spaces
- **Built-in retry logic**: Uses kbnClient's internal retry mechanism with exponential backoff
- **Performance monitoring**: Automatic performance measurement for all operations
- **Comprehensive coverage**: Includes rules, connectors, waiting helpers, and cleanup utilities
- **Robust error handling**: Automatic retry on network errors, timeouts, and HTTP error status codes

## Usage Example

```typescript
import { test } from '@kbn/scout';

test('create and manage alerting rule', async ({ apiServices }) => {
  const { alerting } = apiServices;

  // Create a connector
  const connector = await alerting.connectors.create({
    name: 'test-index-connector',
    connectorTypeId: '.index',
    config: {
      index: 'test-alerts',
      refresh: true,
    },
  });

  // Create a rule
  const rule = await alerting.rules.create({
    name: 'test-es-query-rule',
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
    actions: [
      {
        id: connector.id,
        group: 'query matched',
        params: {
          documents: [{ test: 'value' }],
        },
      },
    ],
    schedule: { interval: '1m' },
  });

  // Wait for rule to be active
  await alerting.waiting.waitForRuleStatus(rule.id, 'ok');

  // Run the rule manually
  await alerting.rules.runSoon(rule.id);

  // Wait for alert to appear in index
  await alerting.waiting.waitForAlertInIndex('test-alerts', rule.id);

  // Disable the rule
  await alerting.rules.disable(rule.id);

  // Cleanup
  await alerting.cleanup.deleteAllRules();
  await alerting.cleanup.deleteAllConnectors();
});

// Working with spaces
import { spaceTest } from '@kbn/scout';

spaceTest('use alerting in custom space', async ({ apiServices, scoutSpace }) => {
  const { alerting } = apiServices;

  const rule = await alerting.rules.create(
    {
      name: 'space-specific-rule',
      ruleTypeId: '.es-query',
      consumer: 'alerts',
      params: {
        /* ... */
      },
    },
    scoutSpace.id
  );

  await alerting.rules.enable(rule.id, scoutSpace.id);
});
```

## API Reference

### Rules Management

- `create(params, spaceId?)` - Create a new rule
- `get(ruleId, spaceId?, options?)` - Get rule details with optional error handling
- `update(ruleId, updates, spaceId?)` - Update a rule
- `delete(ruleId, spaceId?)` - Delete a rule
- `find(searchParams?, spaceId?)` - Search for rules
- `enable(ruleId, spaceId?)` - Enable a rule
- `disable(ruleId, spaceId?)` - Disable a rule
- `muteAll(ruleId, spaceId?)` - Mute all alerts for a rule
- `unmuteAll(ruleId, spaceId?)` - Unmute all alerts for a rule
- `muteAlert(ruleId, alertId, spaceId?)` - Mute a specific alert
- `unmuteAlert(ruleId, alertId, spaceId?)` - Unmute a specific alert
- `snooze(ruleId, duration, spaceId?)` - Snooze a rule
- `unsnooze(ruleId, scheduleIds?, spaceId?)` - Unsnooze a rule
- `runSoon(ruleId, spaceId?)` - Trigger immediate rule execution
- `getRuleTypes(spaceId?)` - Get available rule types
- `getExecutionLog(ruleId, spaceId?)` - Get rule execution history
- `getHealth()` - Get alerting framework health

#### RequestOptions

The `get` method supports additional options:

```typescript
interface RequestOptions {
  ignoreErrors?: number[]; // HTTP status codes to ignore (e.g., [404])
}

// Example: Get rule and ignore 404 errors
const rule = await alerting.rules.get(ruleId, spaceId, { ignoreErrors: [404] });
```

### Connectors Management

- `create(params, spaceId?)` - Create a new connector
- `get(connectorId, spaceId?)` - Get connector details
- `update(connectorId, updates, spaceId?)` - Update a connector
- `delete(connectorId, spaceId?)` - Delete a connector
- `getAll(spaceId?)` - Get all connectors
- `getTypes(spaceId?)` - Get available connector types
- `execute(connectorId, params, spaceId?)` - Execute a connector

### Waiting Helpers

- `waitForRuleStatus(ruleId, expectedStatus, spaceId?, timeoutMs?)` - Wait for rule to reach specific status
- `waitForAlertInIndex(indexName, ruleId, timeoutMs?)` - Wait for alert document in Elasticsearch index
- `waitForExecutionCount(ruleId, count, spaceId?, timeoutMs?)` - Wait for minimum execution count
- `waitForNextExecution(ruleId, spaceId?, timeoutMs?)` - Wait for next rule execution

### Cleanup Utilities

- `deleteAllRules(spaceId?)` - Delete all rules in space
- `deleteAllConnectors(spaceId?)` - Delete all connectors in space
- `deleteRulesByTags(tags, spaceId?)` - Delete rules with specific tags

## Supported Rule Types

Based on the Kibana Alerting API documentation, the service supports all rule types including:

- `.es-query` - Elasticsearch query rules
- `metrics.alert.inventory.threshold` - Infrastructure inventory threshold
- `apm.anomaly` - APM anomaly detection
- `apm.transaction_duration` - APM latency threshold
- `apm.error_rate` - APM error rate
- `slo.rules.burnRate` - SLO burn rate
- Custom rule types defined by plugins

## Error Handling

The service leverages kbnClient's robust built-in retry mechanism with enhanced error reporting:

- **Automatic retries**: All operations retry up to 3 times (configurable via `retries` option)
- **Exponential backoff**: Delay increases with each retry attempt (`1000ms * attempt`)
- **Comprehensive error coverage**: Retries on network errors, timeouts, and HTTP error status codes
- **Enhanced error logging**: Detailed error information including status codes, response bodies, and error causes
- **Ignorable errors**: Specific HTTP errors like 404 can be ignored using `ignoreErrors` option
- **Optimized polling**: Waiting operations use fewer retries (1) to avoid excessive delays during frequent polling

### Enhanced Error Information

The service now provides detailed error context when requests fail:

```
KbnClientRequesterError: [POST - http://localhost:5620/api/alerting/rule]
request failed (attempt=3/3): ERR_BAD_REQUEST
-- Status: 400, Cause: ERR_BAD_REQUEST, Response: {
  "error": "Bad Request",
  "message": "Invalid rule parameters",
  "statusCode": 400,
  "validation": {
    "source": "payload",
    "keys": ["params.threshold"]
  }
} -- and ran out of retries
```

### Retry Strategy Examples

```typescript
// Standard operations use 3 retries
await alerting.rules.create({
  /* params */
});

// Polling operations use 1 retry to avoid delays
await alerting.waiting.waitForRuleStatus(ruleId, 'ok');

// Delete operations ignore 404 errors
await alerting.rules.delete(ruleId); // Won't throw on already-deleted rules

// Get operations with custom error handling
const rule = await alerting.rules.get(ruleId, undefined, { ignoreErrors: [404] });
if (rule.status === 404) {
  console.log('Rule not found');
}
```

## Performance Monitoring

All operations are automatically wrapped with performance measurement using the Scout logger. Performance metrics are logged with operation names like:

- `alertingApi.rules.create [rule-name]`
- `alertingApi.waiting.waitForRuleStatus [rule-id/expected-status]`
- `alertingApi.cleanup.deleteAllRules`
