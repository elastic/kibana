# ES|QL Composer API

ES|QL query composer with a focus on secure input processing and developer
experience. This builder allows developers to conveniently and in a
injection-safe way build ES|QL queries.

## Getting started

To get started import the `esql` tag from ES|QL AST package. The example below
shows a dynamic parameter `param` received externally (maybe from user input),
the parameter can be inserted in to the query using the `${{ param }}` syntax,
it will be correctly treated when the query AST is constructed:

```ts
import { esql } from '@kbn/esql-ast';

const param = 123; // Dynamic parameter, e.g. received from the UI.

const query = esql`
  FROM index
    | WHERE @timestamp >= ${{ param }}
    | SORT @timestamp DESC
    | KEEP service.name, log.level`;
```

You can then "pipe" more commands to the query using the `.pipe` tag:

```ts
query.pipe`LIMIT 10`;
```

Your query is stored as a parsed AST together with the parameter map in the
`query` object. You can dump the contents of the query by simply casting it
to a string:

```ts
console.log(query + '');

// ComposerQuery
// ├─ query
// │  └─ FROM index
// │       | WHERE @timestamp >= ?param
// │       | SORT @timestamp DESC
// │       | KEEP service.name, log.level
// │       | LIMIT 10
// │
// └─ params
//    └─ param: 123
```

Node that `${{ param }}` was a tagged template hole, the param was extracted
into a separate `params` map, which can be safely sent to Elasticsearch as part
of the request.

You can pretty-print the query using the `.print()` method:

```ts
query.print();

// FROM index
//   | WHERE @timestamp >= ?input
//   | SORT @timestamp DESC
//   | KEEP service.name, log.level
//   | LIMIT 10
```

And you can convert the query to a request object that contains the query
text and the parameters map:

```ts
query.toRequest();
// Output:
// { query: 'FROM index | ...', params: {} }

// Params are captured from tagged templates
query.toRequest().params; // [{ input : 123 }]
```

## Reference

TODO: ...
