# @kbn/connector-contract-mock

Dev-only contract mock for the connectors in `@kbn/connector-specs`. It validates the requests a connector makes against the vendor's API spec and answers them with responses that conform to that spec, so connector tests run without vendor credentials or network access.

This package is being built in stages (see [#295684](https://github.com/elastic/kibana/issues/295684)). It currently provides spec loading:

```ts
import { loadContractOperations } from '@kbn/connector-contract-mock';

const operations = loadContractOperations(openApiDocument);
```

`loadContractOperations` accepts a parsed OpenAPI 3.x or Swagger 2.0 document (converted to OpenAPI 3.0 first) and returns its operations: method, path, servers, parameters (with `style` and `explode` defaults applied), request body and responses. Parameter, request body, response and header refs are resolved. Schemas are not dereferenced: each one stays in place in a copy of the document, together with its JSON pointer, so its refs keep resolving against the document. This keeps large specs such as Microsoft Graph fast to load. The schema dialect follows the OpenAPI version: OpenAPI 3.0 schemas for 3.0, JSON Schema 2020-12 for 3.1 and later.

Loading also rewrites schemas as plain JSON Schema and repairs defects common in vendor specs, in place and following refs: OpenAPI 3.0's `nullable` becomes a union with `null`, duplicate `enum` values are removed, regex escapes that are invalid under the `u` flag are dropped, and OpenAPI 3.0's boolean `exclusiveMinimum`/`exclusiveMaximum` become numeric bounds. It then checks every schema for defects that would break validation (unresolvable `$ref`s, unknown `type`s, patterns that don't compile, and keywords with values of the wrong type) and throws an `InvalidSchemaError` listing each operation and location that still has one, so a broken spec fails at load instead of on the first request that uses it.

Schemas are validated with [`@cfworker/json-schema`](https://github.com/cfworker/cfworker/tree/main/packages/json-schema), as draft-07 for OpenAPI 3.0 and draft 2020-12 for 3.1 and later. It interprets schemas without generating code, and checks the JSON Schema formats (such as `date-time`, `email` and `uri`) but not OpenAPI's own (such as `int32` and `byte`).
