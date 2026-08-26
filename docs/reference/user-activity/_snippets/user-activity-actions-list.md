<!-- To regenerate, run: node scripts/generate user-activity-actions-docs -->
### Alerting

| Action | Description |
| --- | --- |
| `alerting_rule_api_key_update` {applies_to}`stack: ga 9.6+` | User updated an alerting rule's API key. |
| `alerting_rule_create` {applies_to}`stack: ga 9.6+` | User created an alerting rule. |
| `alerting_rule_delete` {applies_to}`stack: ga 9.6+` | User deleted an alerting rule. |
| `alerting_rule_disable` {applies_to}`stack: ga 9.6+` | User disabled an alerting rule. |
| `alerting_rule_enable` {applies_to}`stack: ga 9.6+` | User enabled an alerting rule. |
| `alerting_rule_snooze` {applies_to}`stack: ga 9.6+` | User snoozed notifications for an alerting rule. |
| `alerting_rule_unsnooze` {applies_to}`stack: ga 9.6+` | User unsnoozed notifications for an alerting rule. |
| `alerting_rule_update` {applies_to}`stack: ga 9.6+` | User updated an existing alerting rule. |

### Authentication

| Action | Description |
| --- | --- |
| `log_in_user`  | User logged in to Kibana. |
| `log_out_user`  | User logged out of Kibana. |

### Dashboard

| Action | Description |
| --- | --- |
| `dashboard_create`  | User saved a dashboard for the first time. |
| `dashboard_delete`  | User deleted a dashboard. |
| `dashboard_refresh`  | Dashboard panels refreshed after a user action, such as applying a filter, changing the time range, or opening a dashboard with a relative time range. Panels can also refresh automatically at the configured interval. The event measures the time from when the query starts until the last panel finishes loading. |
| `dashboard_update`  | User edited an existing dashboard and saved the changes. |
| `dashboard_view`  | User opened a dashboard. This action can also trigger `dashboard_refresh` when Kibana needs to query panel data, such as when the dashboard uses a relative time range. |

### Discover

| Action | Description |
| --- | --- |
| `discover_session_create` {applies_to}`stack: ga 9.6+` | User created a Discover session. |
| `discover_session_delete` {applies_to}`stack: ga 9.6+` | User deleted a Discover session. |
| `discover_session_update` {applies_to}`stack: ga 9.6+` | User updated an existing Discover session. |
