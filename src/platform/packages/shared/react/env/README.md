# @kbn/react-env

Hooks for accessing Kibana environment information. The environment context is automatically provided by `@kbn/react-kibana-context-root` at the application root when app is wrapped in core rendering context (`core.rendering.addContext`).

## Hooks

### useIsServerless()

Returns `true` if Kibana is running in serverless mode.

```ts
import { useIsServerless } from '@kbn/react-env';

export const MyComponent = () => {
  const isServerless = useIsServerless();
  return <div>{isServerless ? 'Serverless' : 'Stateful'}</div>;
};
```

### useKibanaVersion()

Returns the current Kibana version.

```ts
import { useKibanaVersion } from '@kbn/react-env';

export const MyComponent = () => {
  const version = useKibanaVersion();
  return <div>Version: {version}</div>;
};
```

### useIsDevMode()

Returns `true` if Kibana is running in development mode.

```ts
import { useIsDevMode } from '@kbn/react-env';

export const MyComponent = () => {
  const isDevMode = useIsDevMode();
  return <div>{isDevMode ? 'Dev Mode' : 'Production'}</div>;
};
```
