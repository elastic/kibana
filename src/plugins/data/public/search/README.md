# search

The `search` service provides you with APIs to query elasticsearch.

The services are split into two parts:

# low level API

With low level API you work directly with elasticsearch DSL

```typescript
const results = await data.search.search(request, params);
```

# high level API

With high level API you work with kibana abstractions around elasticsearch DSL: filters, queries and aggregations.

```typescript
const search = data.search.searchSource.createEmpty();
search.setField('query', data.query.queryString);
const results = await search.fetch();
```