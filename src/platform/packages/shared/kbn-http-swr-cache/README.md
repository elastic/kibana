# @kbn/http-swr-cache

Server helper for HTTP `stale-while-revalidate` caching of GET routes whose data changes rarely
(e.g. mapping/schema-derived data). Responses get an `ETag` and
`Cache-Control: private, max-age=<data_views:cache_max_age>, stale-while-revalidate=…`; a matching
`If-None-Match` yields a `304`.

```ts
router.get({ path, validate, security }, async (context, request, response) => {
  const body = await loadSomething();
  return respondWithSwrCache({ context, request, response, body });
});
```

Browsers only cache GET requests, so the route must be a GET.
