---
navigation_title: User activity
applies_to:
  deployment:
    self: ga 9.4
---

# User activity

The user activity service records user actions in Kibana by writing structured log events. It helps you keep a durable record of *what happened*, *to what object*, and *by whom*.

:::::{note}
This functionality is **not** part of the Kibana audit log. The Kibana audit log is a separate feature. For more information, refer to [Kibana audit events](/reference/kibana-audit-events.md).
:::::

## Configuration

The service is disabled by default. Configure it under `user_activity` in `kibana.yml`:

```yaml
user_activity:
  enabled: true
  appenders:
    console_json_default_appender:
      type: console
      layout:
        type: json
  filters:
    - policy: keep
      actions: [user_logged_in]
```

- `user_activity.enabled`: Enables or disables emitting user activity events.
- `user_activity.appenders`: Logging appenders used by the service. This uses the same appender schema as Kibana logging. For more details, refer to [Logging settings](/reference/configuration-reference/logging-settings.md). By default, it uses a JSON console appender.
- `user_activity.filters`: Optional list of filter rules applied to `event.action`.

When enabled, events are logged under the logger context `user_activity.event` and include the fields `{ message, event, object, metadata, error, user, session, ...}`.

### Filters

Filters are evaluated with **AND semantics**: for an activity to be logged, its `event.action` must pass **all** configured filter rules.

Each filter has:

- `policy`: `keep` or `drop`
- `actions`: list of action IDs (see [Available actions](#available-actions))

`keep` allows only actions listed in `actions`. `drop` excludes actions listed in `actions`. If you don’t configure any filters, all actions are eligible to be logged.

## Available actions

% This list is generated from the action registries in code. To regenerate it, run `node scripts/generate user-activity-actions-docs`.

:::::{include} user-activity/_snippets/user-activity-actions-list.md
:::::

## Logs schema

User activity events are written as JSON log entries. When using the JSON logging layout, these entries are ECS-compatible (see [Elastic Common Schema (ECS)](ecs://reference/index.md)) and may include additional non-ECS fields used by Kibana (for example, `kibana.space.id` and `object.*`).

### Base fields

| **Field** | **Description** |
| --- | --- |
| `@timestamp` | The timestamp of the event. |
| `message` | Human readable description of the action performed. |

### Event fields

| **Field** | **Description** |
| --- | --- |
| `event.action` | Human readable standardized description of the action performed. Refer to [Available actions](#available-actions) for a list of possible values. |
| `event.type` | Human readable standardized categorization of actions performed. |
| `event.outcome` {applies_to}`stack: ga 9.5+` | (Optional) Denotes whether the event represents a success or a failure from the perspective of the entity that produced the event: `success`, `failure`, or `unknown`. |
| `event.start` | (Optional) ISO8601 timestamp of the event start time. |
| `event.end` | (Optional) ISO8601 timestamp of the event end time. |
| `event.duration` | (Optional) Duration (in ns) between the event start and end timestamps. |

### Tracing fields

| **Field** | **Description** |
| --- | --- |
| `trace.id` | Correlation id for events that happen together (for example, events for the same HTTP request). |

### Session fields

| **Field** | **Description** |
| --- | --- |
| `session.id` | Redacted id of the session. |

### Space fields

| **Field** | **Description** |
| --- | --- |
| `kibana.space.id` | ID of the space where the action originates from. |

### User fields

| **Field** | **Description** |
| --- | --- |
| `user.id` | Unique identifier of the user. |
| `user.name` | Username of the user. |
| `user.email` | Email address of the user at the time of the action. |
| `user.roles` | Kibana roles of the user at the time of the action. |

:::::{note}
Some actions, such as `log_in_user` and `log_out_user`, are recorded on unauthenticated requests. For these events, the `user.*` and `session.id` fields may not be populated. The identity of the user can still be determined from the `object.*` fields.
:::::

### Client and HTTP fields

| **Field** | **Description** |
| --- | --- |
| `client.ip` | IP address of the client that performed the action. |
| `client.address` | Copy of `client.ip` for OpenTelemetry compliance. |
| `http.request.referrer` | Referrer associated with the request that triggered the action. |

### Object fields

| **Field** | **Description** |
| --- | --- |
| `object.id` | Unique id of the target. |
| `object.name` | Target resource name. |
| `object.type` | Target resource type of the action. |
| `object.tags` | List of tags assigned to the target. |

### Metadata fields

| **Field** | **Description** |
| --- | --- |
| `metadata` | (Optional) Additional bucket of non-standard metadata specific to the Kibana usage log. |

### Error fields

| **Field** | **Description** |
| --- | --- |
| `error.type` {applies_to}`stack: ga 9.5+` | (Optional) The type of the error, for example the class name of the exception. |
| `error.message` {applies_to}`stack: ga 9.5+` | (Optional) Error message. |
| `error.stack_trace` {applies_to}`stack: ga 9.5+` | (Optional) The stack trace of this error in plain text. |
| `error.code` {applies_to}`stack: ga 9.5+` | (Optional) Error code describing the error. |

### Service fields

| **Field**            | **Description**                                |
|----------------------|------------------------------------------------|
| `service.id`         | The cluster ID.                                |
| `service.node.roles` | Roles of Kibana: `["ui", "background_tasks"]`. |
| `service.state`      | The status of Kibana.                          |
| `service.type`       | `kibana`.                                      |
| `service.version`    | Version of Kibana that emitted the event.      |
