---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/elasticsearch-service.html
---

# Elasticsearch service [elasticsearch-service]

`Elasticsearch service` provides `elasticsearch.client` program API to communicate with Elasticsearch server HTTP API.

::::{note}
The Elasticsearch service is only available server side. You can use the [Data plugin](https://github.com/elastic/kibana/blob/master/src/platform/plugins/shared/data/README.mdx).
::::


`elasticsearch.client` interacts with Elasticsearch service on behalf of:

* `kibana_system` user via `elasticsearch.client.asInternalUser.*` methods.
* a current end-user via `elasticsearch.client.asCurrentUser.*` methods. In this case Elasticsearch client should be given the current user credentials. See [Scoped services](/extend/patterns.md#scoped-services) and [Security](/extend/development-security.md).

```typescript
import { CoreStart, Plugin } from '@kbn/core/public';

export class MyPlugin implements Plugin {
  public start(core: CoreStart) {
    async function asyncTask() {
      const result = await core.elasticsearch.client.asInternalUser.ping(…);
    }
    asyncTask();
  }
}
```

For advanced use-cases, such as a search for specific objects, use the [Global search plugin](https://github.com/elastic/kibana/blob/master/x-pack/platform/plugins/shared/global_search/README.md).

