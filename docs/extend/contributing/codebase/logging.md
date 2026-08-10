---
navigation_title: "Logging"
description: "Editorial guidelines for Kibana log messages: what to include, what to leave out, and how to phrase them."
---

# Logging

This page covers *what makes a good log message* in {{kib}}. For how to instantiate and call a logger from your plugin, see the [logging service tutorial](../../tutorials/logging-service.md). For security-sensitive actions that need to be recorded separately, see [audit logging](../../key-concepts/security/audit-logging.md).

- Do not log sensitive information (personally identifiable information, passwords, api keys, etc.), regardless of the log level. Err on the side of caution. Personally identifiable information is common in user input; for example, dashboard titles, index names and Elasticsearch `_search` queries.
- Logs should include just enough information to be actionable.
- Use the right log level. The [logging service tutorial](../../tutorials/logging-service.md) shows each level in use; as a rule of thumb: `trace`/`debug` for developer diagnostics, `info` for noteworthy lifecycle events (sparingly — see the HTTP API [observability guidance](../api-design/guidelines-for-http-api-design-in-kibana.md#observability)), `warn` for recoverable anomalies, `error`/`fatal` for failures that need attention.
- Use ECS format for any additional LogMeta you add to your logging statements.
- Logs are read by customers, a large number of Elastic employees, and {{kib}} contributors. As such, log messages should use language that is understandable to a wide audience and should avoid disclosing implementation details (unless they're at the `debug`/`trace` level).

## Structured meta and filters [structured-meta-and-filters]

Operators can configure [meta filters](/reference/configuration-reference/logging-settings.md) on a logger so that records matching selected `LogMeta` fields are logged at a more verbose level than the logger's nominal level. That only works if call sites pass filterable structured meta.

Recommended conventions:

| Purpose | Where to put it | Example filter path |
| --- | --- | --- |
| Stable entity IDs (rule, action, connector, space) | `labels.*` | `labels.ruleType`, `labels.actionId` |
| Categorical event class | `tags` (string array) | not used by meta filters |
| Message text | first argument / message function | not filterable by meta |

Do:

```typescript
logger.error(error, {
  labels: { actionId, actionTypeId, ruleId, spaceId },
  tags: ['action-run-failed'],
});
```

Avoid burying IDs only in the message string or in `tags` if operators need to filter on them:

```typescript
// Hard to filter with logging.loggers[].filters
logger.error(`Action '${actionId}' failed: ${error.message}`, {
  tags: [actionTypeId, actionId, 'action-run-failed'],
});
```

See the [logging service tutorial](../../tutorials/logging-service.md#logging-structured-meta) for a full operator-facing example.
