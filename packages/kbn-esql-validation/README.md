# @kbn/esql-validation

This package provides a public API for the ES|QL validation feature.
The package is designed to be used directly with a ES|QL querystring as follow:

```js
import { validate } from '@kbn/esql-validation'

const {errors, warnings} = await validate("from index | stats 1 + avg(myColumn)");

console.log(errors);
```

The `validate` function has the following arguments:

* `queryString`
  * type: `string`
  > the ES|QL query string

* `ASTProvider`
  * `((query: string) => ESQLAst) | undefined`
  > A function to retrieve the AST from a query string. If not passed the default one from `@kbn/esql-ast-core` package is used.

* `callbacks`
  * 
  ```typescript
  {
    getSources?: () => Promise<Array<{ name: string; hidden: boolean }>>,
    getFieldsFor?: ({ query: string }) => Promise<Array<{ name: string; type: string }>>,
    getMetaFields?: () => Promise<string>,
    getPolicies?: () => Promise<Array<{ name: string; sourceIndices: string[]; matchField: string; enrichFields: string[] }>>,
    getPolicyFields?: () => Promise<string>,
    getPolicyMatchingField?: () => Promise<string>;
  }
  ```
  > A set of callbacks to retrieve metadata about index, policies, fields, etc...

## Advanced usage

### Passing partial callbacks

```js
import { validate } from '@kbn/esql-validation';

// Passing only 2 callbacks makes the validation perform more checks selectively
// so now the unknownIndex and meta fields errors are returned as well.
// In this case columns or policies, for instance, won't be validate due to lack of information.
const callbacks = {
    getSources: async () => [{name: "index", hidden: false}],
    getMetaFields: async () => ["_source", "_id"]
};

const {errors, warnings} = await validate("from index | stats 1 + avg(myColumn)", undefined, callbacks);
```

### Passing a custom AST provider

```js
import { validate } from '@kbn/esql-validation';


// the AST is loaded on a web worker (i.e. in Kibana Monaco to offload the initial bundle size)
const worker = await getWebWorkerInterface(model.uri);
const {errors, warnings} = await validate("from index | stats 1 + avg(myColumn)", worker.getASTProvider, callbacks);
```
