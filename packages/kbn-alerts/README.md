# AlertsFeatureNoPermissions

Component displayed when a user with alerts permissions of `none` attempts to access alerts page. 

## useGetUserAlertsPermissions

This hook parses through the uiCapabilities Kibana object to determine if the user has Kibana `read` or `crud` permissions for alerts.
