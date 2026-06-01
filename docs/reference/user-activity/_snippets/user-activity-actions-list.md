<!-- To regenerate, run: node scripts/generate user-activity-actions-docs -->
### Authentication

| Action | Description |
| --- | --- |
| `log_in_user`  | User logged in to Kibana. |
| `log_out_user`  | User logged out of Kibana. |

### Dashboard

| Action | Description |
| --- | --- |
| `dashboard_create` {applies_to}`stack: ga 9.5+` | User created a dashboard. |
| `dashboard_delete` {applies_to}`stack: ga 9.5+` | User deleted a dashboard. |
| `dashboard_refresh` {applies_to}`stack: ga 9.5+` | The dashboard was refreshed (either by the user or auto-refresh interval). |
| `dashboard_update` {applies_to}`stack: ga 9.5+` | User updated a dashboard. |
| `dashboard_view` {applies_to}`stack: ga 9.5+` | User viewed a dashboard. |
