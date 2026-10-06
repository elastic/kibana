# @kbn/connector-contract-mock

Dev-only contract mock for the connectors in `@kbn/connector-specs`. It validates the requests a connector makes against the vendor's API spec and answers them with responses that conform to that spec, so connector tests run without vendor credentials or network access.

This package is being built in stages (see [#295684](https://github.com/elastic/kibana/issues/295684)). It currently provides spec loading:

```ts
import { loadContractOperations } from '@kbn/connector-contract-mock';

const operations = loadContractOperations(openApiDocument);
```

`loadContractOperations` accepts a parsed OpenAPI 3.x or Swagger 2.0 document and returns operations in the shape the Prism validator expects. Loading:

- keeps schema refs pointing into one shared bundle instead of dereferencing them, which keeps large specs such as Microsoft Graph fast to load;
- repairs schema defects common in vendor specs: `nullable` without `type`, duplicate `enum` values, regex escapes that are invalid under the `u` flag, and `null` in parameter types;
- compiles every schema and throws a `SchemaCompileError` listing each operation and location that still fails. Prism would otherwise treat such a schema as matching any value and silently skip validation.
