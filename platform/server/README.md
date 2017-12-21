Platform Server Modules
=======================

Elasticsearch
-------------
Exposes `AdminClient` and `ScopedDataClient`, which when passed an elasticsearch-js client, will wrap it and expose call methods that hit the elasticsearch API. The `AdminClient` should receive a client that sets `shouldAuth: false` in its config. This ensures that all calls to elasticsearch using the `AdminClient` will use the internal kibana auth strategy rather than accept auth from the request headers.

The `ScopedDataClient` receives a client and filtered request headers. The request headers currently should only consist of the `authorization` header. When the `ScopedDataClient`'s `call` method is used, it passes the headers along to the elasticsearch-js client. Since that client is a data client, it knows how to process the request in the scope of those headers.

`ElasticsearchService` is a class whose instances have a method `start` that subscribes to its `clients$` observable. At this point, it creates an admin client and a data client. Each started `ElasticsearchService` instance creates only one of each client. The instance also has a `getAdminClient$` method that creates a new `AdminClient` by passing it the latest admin client from its `clients$` observable. `getScopedDataClient$` similarly returns a new `ScopedDataClient` observable that wraps the data client from the `clients$` observable, but it also takes in headers, which get filtered and passed into the `ScopedDataClient` constructor. It also uses the latest config from the configs$ observable in cases where the config is updated. `getScopedDataClient` just returns a Promise for a `ScopedDataClient` from `getScopedDataClient$`.

How you'd get an `AdminClient` that's bound to the same underlying elasticsearch-js client across requests:
```js
// adminClient is the same across requests
const adminClient$ = elasticsearch.service.getAdminClient$();
```

### Other clients
We might want an unscoped data client for API calls that hit the data cluster but use the internal kibana user for auth. Then we could create a generic `DataClient` class that `UnscopedDataClient` and `ScopedDataClient` extend. Or maybe just `ScopedDataClient` would extend `DataClient`, which would be assumed to be unscoped.

```js
// for health check, e.g. which uses callWithInternalUser
const unscopedDataClient = elasticsearch.getUnscopedDataClient();
```

We may want a scoped admin client, too. Sometimes we need to hit the admin cluster with auth based on headers. e.g. SAML or Basic Auth. We might then have ScopedAdminClient extend AdminClient and take in headers.

```js
// SAML or Basic Auth case
const scopedAdminClient = elasticsearch.getScopedAdminClient(headers);
```

Http Server
-----------
TODO: explain

Kibana
-------
TODO: explain

Plugins
-------
TODO: explain
