# @kbn/cleanup-before-exit

Utilities for registering asynchronous cleanup tasks that should run before a Node.js process exits.

## Usage

```ts
import { cleanupBeforeExit } from '@kbn/cleanup-before-exit';

cleanupBeforeExit(
  async () => {
    await closeServices();
  },
  { blockExit: true, timeout: 10_000 }
);
```

## Options

| Option      | Default | Description                                                                                               |
| ----------- | ------- | --------------------------------------------------------------------------------------------------------- |
| `blockExit` | `false` | When `true`, overrides `process.exit` so the process waits for the handler to settle.                     |
| `timeout`   | `5000`  | Milliseconds to wait before the handler is considered timed out; the timeout error is logged and ignored. |

Handlers are guaranteed to only run once, all run in parallel, and any rejections are logged via OpenTelemetry `diag`.
