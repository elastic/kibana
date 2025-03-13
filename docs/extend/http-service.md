---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/http-service.html
---

# HTTP service [http-service]

::::{note}
The HTTP service is available both server and client side.
::::


## Server side usage [_server_side_usage]

The server-side HttpService allows server-side plugins to register endpoints with built-in support for request validation. These endpoints may be used by client-side code or be exposed as a public API for users. Most plugins integrate directly with this service.

The service allows plugins to: * to extend the {{kib}} server with custom HTTP API. * to execute custom logic on an incoming request or server response. * implement custom authentication and authorization strategy.

Refer to [HTTP service contract types](https://github.com/elastic/kibana//blob/8.9/src/core/packages/http/server/src/http_contract.ts).

```typescript
import { schema } from '@kbn/config-schema';
import type { CoreSetup, Plugin } from '@kbn/core/server';

export class MyPlugin implements Plugin {
  public setup(core: CoreSetup) {
    const router = core.http.createRouter();

    const validate = {
      params: schema.object({
        id: schema.string(),
      }),
    };

    router.get({
      path: 'my_plugin/{id}',
      validate
    },
    async (context, request, response) => {
      const data = await findObject(request.params.id);
      if (!data) return response.notFound();
      return response.ok({
        body: data,
        headers: {
          'content-type': 'application/json'
        }
      });
    });
  }
}
```


## Client side usage [_client_side_usage]

The HTTP service is also offered on the client side and provides an API to communicate with the {{kib}} server via HTTP interface. The client-side HttpService is a preconfigured wrapper around `window.fetch` that includes some default behavior and automatically handles common errors (such as session expiration). The service should only be used for access to backend endpoints registered by the same plugin. Feel free to use another HTTP client library to request 3rd party services.

```typescript
import { CoreStart } from '@kbn/core/public';
interface ResponseType {…};
interface MyPluginData {…};
async function fetchData<ResponseType>(core: CoreStart) {
  return await core.http.get<MyPluginData>(
    '/api/my_plugin/',
    { query: … },
  );
}
```

Refer to [the client-side APIs](https://github.com/elastic/kibana//blob/8.9/src/core/packages/http/browser/src/types.ts).


