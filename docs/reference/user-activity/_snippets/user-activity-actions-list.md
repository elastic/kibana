<!-- To regenerate, run: node scripts/generate user-activity-actions-docs -->
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

### Feature flags

| Action | Description |
| --- | --- |
| `feature_flag_app_create` {applies_to}`stack: ga 9.7+` | User created an app that evaluates feature flags. |
| `feature_flag_app_delete` {applies_to}`stack: ga 9.7+` | User deleted an app that evaluates feature flags, along with its credentials. |
| `feature_flag_app_update` {applies_to}`stack: ga 9.7+` | User updated an app that evaluates feature flags. |
| `feature_flag_create` {applies_to}`stack: ga 9.7+` | User created a feature flag. |
| `feature_flag_credential_create` {applies_to}`stack: ga 9.7+` | User generated the first SDK key and client ID that an app uses to evaluate feature flags in an environment. |
| `feature_flag_credential_delete` {applies_to}`stack: ga 9.7+` | User revoked the SDK key and client ID that an app uses to evaluate feature flags in an environment. |
| `feature_flag_credential_update` {applies_to}`stack: ga 9.7+` | User rotated the SDK key (and optionally the client ID) that an app uses to evaluate feature flags in an environment. |
| `feature_flag_delete` {applies_to}`stack: ga 9.7+` | User deleted a feature flag. |
| `feature_flag_environment_create` {applies_to}`stack: ga 9.7+` | User created a feature flag environment. |
| `feature_flag_environment_delete` {applies_to}`stack: ga 9.7+` | User deleted a feature flag environment, along with its credentials. |
| `feature_flag_environment_update` {applies_to}`stack: ga 9.7+` | User updated a feature flag environment. |
| `feature_flag_update` {applies_to}`stack: ga 9.7+` | User updated the definition or evaluation rules of a feature flag. |
