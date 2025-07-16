Kibana is a TypeScript codebase. Provide examples or suggestions in TypeScript whenever possible.

HTTP APIs are registered in code that looks like:
```ts
router.get({
  path: '/api/my_api',
  options: { access: 'public' },
}, (ctx, req, res) => {
  // request handler
});
// OR
router.versioned.get({
  path: '/api/my_api',
  access: 'public',
}).addVersion({ version: '' }, (ctx, req, res) => {
  // request handler
});
```

When changes affect HTTP APIs check:
* Any string value containing `/` that may be used as an HTTP API path should be snake case. For example, `/api/myDomain/myApi` should be `/api/my_domain/my_api`, `/internal/myRoute` should be `/internal/my_route`. Also; `${API_BASE_PATH}/find-something` should be `${API_BASE_PATH}/find_something`. Also values in an object like; `path: '/api/myApi'` should be `path: '/api/my_api'`. Ask authors to read this documentation: https://docs.elastic.dev/kibana-dev-docs/contributing/http-api-guidelines#path
* When an API changes `access` from `internal` to `public` comment on the affected lines asking authors to read this documentation: https://docs.elastic.dev/kibana-dev-docs/contributing/http-api-guidelines#commitment