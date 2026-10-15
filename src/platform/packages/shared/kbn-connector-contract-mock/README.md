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

1. routes it to an operation by server URL and path template, answering **404** with the method and URL when none matches and **405** naming the allowed methods when only the method is wrong;
2. validates it against the operation, answering **422** with `{ operation, violations }` when it breaks the spec. Parameters are deserialized by `style` and `explode` and checked against their schemas, as is the body for its declared content type. Undeclared query parameters and repeated keys for `explode: false` parameters are flagged too;
3. builds a response, then validates its status code, headers and body against the spec.

By default, the response is sampled from the spec. The mock picks the lowest declared 2xx response (then `2XX`, then `default`) and the content type that best matches the request's `Accept` header, preferring JSON. It answers **406** when no content type matches. Values come from the schema's first `examples` entry, `example`, `default`, `const` or `enum` value, and otherwise from a placeholder that matches the schema's type, format and bounds. Below a fixed depth only required properties are generated, which keeps recursive schemas finite. Pass `respond: (operation, request) => response` to answer differently.

Each request is recorded in `calls` with its operation, status, and request and response violations, so tests can assert that a connector stays within the contract.

## Spec loading

`loadContractOperations` accepts a parsed OpenAPI 3.x or Swagger 2.0 document (converted to OpenAPI 3.0 first) and returns its operations: method, path, servers, parameters (with `style` and `explode` defaults applied), request body and responses. Parameter, request body, response and header refs are resolved. Schemas are not dereferenced: each one stays in place in a copy of the document, together with its JSON pointer, so its refs keep resolving against the document. This keeps large specs such as Microsoft Graph fast to load. The schema dialect follows the OpenAPI version: OpenAPI 3.0 schemas for 3.0, JSON Schema 2020-12 for 3.1 and later.

Loading also rewrites schemas as plain JSON Schema and repairs defects common in vendor specs, in place and following refs: OpenAPI 3.0's `nullable` becomes a union with `null`, duplicate `enum` values are removed, regex escapes that are invalid under the `u` flag are dropped, and OpenAPI 3.0's boolean `exclusiveMinimum`/`exclusiveMaximum` become numeric bounds. It then checks every schema for defects that would break validation (unresolvable `$ref`s, unknown `type`s, patterns that don't compile, and keywords with values of the wrong type) and throws an `InvalidSchemaError` listing each operation and location that still has one, so a broken spec fails at load instead of on the first request that uses it.

Schemas are validated with [`@cfworker/json-schema`](https://github.com/cfworker/cfworker/tree/main/packages/json-schema), as draft-07 for OpenAPI 3.0 and draft 2020-12 for 3.1 and later. It interprets schemas without generating code, and checks the JSON Schema formats (such as `date-time`, `email` and `uri`) but not OpenAPI's own (such as `int32` and `byte`).
