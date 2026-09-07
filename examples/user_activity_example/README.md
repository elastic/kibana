# User Activity Example

This plugin demonstrates how to use the User Activity Service to track user actions.

## How to run

1. Enable the service in `kibana.yml`:

```yaml
user_activity:
  enabled: true
```

2. Start Kibana with examples:

```bash
node scripts/build_kibana_platform_plugins --examples --test-plugins
yarn start --run-examples
```

3. Navigate to **Developer Examples** > **User Activity**

4. Click the "Track User Action" button

5. Check your Kibana logs for the tracked action with injected user context

## What it demonstrates

- Calling `core.userActivity.trackUserAction()` from a server-side route
- The service automatically enriches logs with user, session, and space context
