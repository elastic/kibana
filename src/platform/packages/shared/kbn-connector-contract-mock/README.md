# @kbn/connector-contract-mock

Dev-only contract mock for the connectors in `@kbn/connector-specs`. It validates the requests a connector makes against the vendor's API spec and answers them with responses that conform to that spec, so connector tests run without vendor credentials or network access.

This package is being built in stages (see [#295684](https://github.com/elastic/kibana/issues/295684)).

## In-process mock

```ts
import { createContractMockFetch } from '@kbn/connector-contract-mock';

const { fetch, calls } = createContractMockFetch({ specs: [openApiDocument] });
```

The mock is a standard `fetch`. Connector clients built on axios use it through axios's fetch adapter, `{ adapter: 'fetch', env: { fetch } }`, so axios still builds the URL and serializes parameters exactly as it would against the vendor. The package itself doesn't depend on axios, whose new use Kibana disallows.

For every request, the mock:

1. routes it to an operation, answering **404** with the method and URL when none matches;
2. validates it against the operation, answering **422** with `{ operation, violations }` when it breaks the spec. Besides Prism's checks on parameters, headers and body, this flags undeclared query parameters and repeated keys for `explode: false` parameters;
3. builds a response, then validates it against the spec.

By default, the response is sampled from the spec. The mock picks the lowest declared 2xx response (then `2XX`, then `default`) and the content type that best matches the request's `Accept` header, preferring JSON. It answers **406** when no content type matches. Values come from the schema's first `examples` entry, `example`, `default`, `const` or `enum` value, and otherwise from a placeholder that matches the schema's type, format and bounds. Below a fixed depth only required properties are generated, which keeps recursive schemas finite. Pass `respond: (operation, request) => response` to answer differently.

Each request is recorded in `calls` with its operation, status, and request and response violations, so tests can assert that a connector stays within the contract.

## Spec loading

`loadContractOperations` accepts a parsed OpenAPI 3.x or Swagger 2.0 document and returns operations in the shape the Prism validator expects. Loading:

- keeps schema refs pointing into one shared bundle instead of dereferencing them, which keeps large specs such as Microsoft Graph fast to load;
- repairs schema defects common in vendor specs: `nullable` without `type`, duplicate `enum` values, regex escapes that are invalid under the `u` flag, and `null` in parameter types;
- compiles every schema and throws a `SchemaCompileError` listing each operation and location that still fails. Prism would otherwise treat such a schema as matching any value and silently skip validation.
