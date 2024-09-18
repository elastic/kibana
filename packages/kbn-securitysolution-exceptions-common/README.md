# Security Solution Exceptions common package

The package contains common files for the Exceptions feature.

`common` in the name highlights that this package is intended to combine any common entities related to Exceptions in this package. E.g. the other `kbn-securitysolution-exception-list-*` packages
content should be moved here while `kbn-securitysolution-io-ts-list-types` package should be
gone eventually.

## API folder

`api` folder contains OpenAPI schemas for Security Solution Exceptions feature. There are automatically generated Zod schemas and TS types for each schemas located in corresponding
`*.gen.ts` files.

**Please add any Exceptions feature related schemas to this package.**

TS types and/or Zod schemas can be imported in a plugin or another package like

```ts
import { CreateExceptionRequestBody } from '@kbn/securitysolution-exceptions-common/api';
```
