# @kbn/connector-contract-mock

Dev-only contract mock for the connectors in `@kbn/connector-specs`. It validates the requests a connector makes against the vendor's API spec and answers them with responses that conform to that spec, so connector tests run without vendor credentials or network access.

This package is being built in stages (see [#295684](https://github.com/elastic/kibana/issues/295684)). Responses currently come from a `respond` function you provide; a response engine that derives them from the spec follows.

## In-process mock

```ts
import { createContractMockFetch } from '@kbn/connector-contract-mock';

const { fetch, calls } = createContractMockFetch({
  specs: [openApiDocument],
  respond: (operation, request) => ({
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: [],
  }),
});
```

The mock is a standard `fetch`. Connector clients built on axios use it through axios's fetch adapter, `{ adapter: 'fetch', env: { fetch } }`, so axios still builds the URL and serializes parameters exactly as it would against the vendor. The package itself doesn't depend on axios, whose new use Kibana disallows.

For every request, the mock:

1. routes it to an operation, answering **404** with the method and URL when none matches;
2. validates it against the operation, answering **422** with `{ operation, violations }` when it breaks the spec. Besides Prism's checks on parameters, headers and body, this flags undeclared query parameters and repeated keys for `explode: false` parameters;
3. calls `respond`, then validates the response against the spec.

Each request is recorded in `calls` with its operation, status, and request and response violations, so tests can assert that a connector stays within the contract.

## Spec loading

`loadContractOperations` accepts a parsed OpenAPI 3.x or Swagger 2.0 document and returns operations in the shape the Prism validator expects. Loading:

- keeps schema refs pointing into one shared bundle instead of dereferencing them, which keeps large specs such as Microsoft Graph fast to load;
- repairs schema defects common in vendor specs: `nullable` without `type`, duplicate `enum` values, regex escapes that are invalid under the `u` flag, and `null` in parameter types;
- compiles every schema and throws a `SchemaCompileError` listing each operation and location that still fails. Prism would otherwise treat such a schema as matching any value and silently skip validation.
