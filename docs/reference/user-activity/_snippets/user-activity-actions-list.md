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
