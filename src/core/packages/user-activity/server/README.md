# @kbn/core-user-activity-server

This package contains the public types for Core's server-side user activity service.

## Usage

Use `trackUserAction` to record user actions:

```ts
core.userActivity.trackUserAction({
  event: { action: 'dashboard_created', type: 'creation' },
  object: { id: 'dash-123', name: 'My Dashboard', type: 'dashboard', tags: ['production'] },
});
```

You can optionally provide a custom message:

```ts
core.userActivity.trackUserAction({
  message: 'User duplicated dashboard',
  event: { action: 'dashboard_copied', type: 'creation' },
  object: { id: 'dash-456', name: 'Copy of My Dashboard', type: 'dashboard', tags: [] },
});
```

## Configuration

Configure the service in `kibana.yml`:

```yaml
user_activity:
  enabled: true
  appenders:
    # If you don't provide any appender, this is the default we'll use if enabled 
    console:
      type: console
      layout:
        type: json
    # Example: write to file
    file:
      type: file
      fileName: /var/log/kibana/user_activity.log
      layout:
        type: json
```

The `appenders` option uses the same schema as the core logging service.

## Injected Context

The following context is automatically added to every log entry by Kibana's HTTP middleware:

| Field | Description |
|-------|-------------|
| `user.id` | User's profile UID |
| `user.username` | Username |
| `user.email` | Email address |
| `user.roles` | Array of roles |
| `client.ip` | IP address |
| `client.address` | IP address (OTel compliance) |
| `session.id` | Session ID |
| `kibana.space.id` | Current space ID |
| `http.request.referrer` | Referrer |
