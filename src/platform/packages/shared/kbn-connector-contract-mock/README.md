# @kbn/connector-contract-mock

Dev-only contract mock for the connectors in `@kbn/connector-specs`. It validates the requests a connector makes against the vendor's API spec and answers them with responses that conform to that spec, so connector tests run without vendor credentials or network access.

This package is being built in stages (see [#295684](https://github.com/elastic/kibana/issues/295684)). It currently provides spec loading:

```ts
import { loadContractOperations } from '@kbn/connector-contract-mock';

const operations = loadContractOperations(openApiDocument);
```

`loadContractOperations` accepts a parsed OpenAPI 3.x or Swagger 2.0 document (converted to OpenAPI 3.0 first) and returns its operations: method, path, servers, parameters (with `style` and `explode` defaults applied), request body and responses. Parameter, request body, response and header refs are resolved. Schemas are not dereferenced: each one stays in place in a copy of the document, together with its JSON pointer, so its refs keep resolving against the document. This keeps large specs such as Microsoft Graph fast to load. The schema dialect follows the OpenAPI version: OpenAPI 3.0 schemas for 3.0, JSON Schema 2020-12 for 3.1 and later.
