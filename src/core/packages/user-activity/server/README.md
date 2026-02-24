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

## Registering new actions

Every action must be registered in `userActivityActions` (`src/user_activity_actions.ts`).
Each entry requires a `description`, an `ownerTeam` (GitHub team handle), and a `versionAddedAt` (Stack version when the action was introduced).

```ts
export const userActivityActions = {
  // ... existing actions ...
  archive_case: {
    description: 'Archive a case',
    ownerTeam: '@elastic/kibana-cases',
    groupName: 'Cases',
    versionAddedAt: '9.3',
  },
} as const satisfies Record<string, UserActivityActionDefinition>;
```

When an action is removed, move it from `userActivityActions` to `removedUserActivityActions` and add `versionRemovedAt`.

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
| `user.name` | Username |
| `user.email` | Email address |
| `user.roles` | Array of roles |
| `client.ip` | IP address |
| `client.address` | IP address (OTel compliance) |
| `session.id` | Session ID |
| `kibana.space.id` | Current space ID |
| `http.request.referrer` | Referrer |
