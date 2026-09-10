# Scout API Services

API services provide server-side helpers through the `apiServices` fixture.
Keep API services strictly server-side (no UI interactions).
Import helper utilities (like `measurePerformanceAsync`) from the Scout package used by the module (`@kbn/scout` or the relevant solution package).

## Create a new API service (summary)

1. Add a new service file under the API fixtures directory.
2. Add a `types.ts` file for request/response types when the API is non-trivial.
3. Export a helper function that accepts `log` and `kbnClient` and uses
   `kbnClient.request` with retries (and `ignoreErrors` when needed).
4. Wrap calls with `measurePerformanceAsync` for consistent logging.
5. Register the service in the API fixtures index so it appears under
   `apiServices.<name>`.

## Minimal sketch

```ts
import type { KbnClient, ScoutLogger } from '@kbn/scout'; // or the module's Scout package (e.g. @kbn/scout-security)
import { measurePerformanceAsync } from '@kbn/scout'; // or the module's Scout package

export interface MyApiService {
  enable: () => Promise<void>;
}

export const getMyApiService = ({
  log,
  kbnClient,
}: {
  log: ScoutLogger;
  kbnClient: KbnClient;
}): MyApiService => {
  return {
    enable: async () => {
      await measurePerformanceAsync(log, 'myService.enable', async () => {
        await kbnClient.request({
          method: 'POST',
          path: '/api/my/endpoint',
          retries: 3,
        });
      });
    },
  };
};
```

Register it in the fixture so tests can call:

```ts
await apiServices.myService.enable();
```

When adding a module-local API service, extend the `apiServices` fixture (prefer worker scope) and merge in the new
service:

```ts
apiServices: async ({ apiServices, kbnClient, log }, use) => {
  const extended = {
    ...apiServices,
    myService: getMyApiService({ kbnClient, log }),
  };

  await use(extended);
}
```
