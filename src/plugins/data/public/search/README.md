# search

The `search` service provides you with APIs to query Elasticsearch.

The services are split into two parts: (1) low-level API; and (2) high-level API.

## Low-level API

With low level API you work directly with elasticsearch DSL

```typescript
const results = await data.search.search(request, params);
```

## High-level API

Using high-level API you work with Kibana abstractions around Elasticsearch DSL: filters, queries, and aggregations. Provided by the *Search Source* service.

```typescript
const search = data.search.searchSource.createEmpty();
search.setField('query', data.query.queryString);
const results = await search.fetch();
```
