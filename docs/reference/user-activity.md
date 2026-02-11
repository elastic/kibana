---
navigation_title: User activity
applies_to:
  stack: ga 9.4
---

# User activity

The user activity service records user actions in Kibana by writing structured log events. It helps you keep a durable record of *what happened*, *to what object*, and *by whom*.

:::::{note}
This feature is currently available only in **self-managed** deployments. It is not available in Elastic Cloud Hosted or Elastic Cloud Serverless.
:::::

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
```

- `user_activity.enabled`: Enables or disables emitting user activity events.
- `user_activity.appenders`: Logging appenders used by the service. This uses the same appender schema as Kibana logging. For more details, refer to [Logging settings](/reference/configuration-reference/logging-settings.md). By default, it uses a JSON console appender.

When enabled, events are logged under the logger context `user_activity.event` and include the fields `{ message, event, object, user, session, ...}`.

## Available actions

This list is generated from the action registries in code. To regenerate it, run `node scripts/generate user-activity-actions-docs`.

:::::{include} user-activity/_snippets/user-activity-actions-list.md
:::::

