# @kbn/handlebars

A custom version of the handlebars package which, to improve security, does not use `eval` or `new Function`. This means that templates can't be compiled into JavaScript functions in advance and hence, rendering the templates is a lot slower.

## Limitations

- Only the following compile options are supported:
  - `knownHelpers`
  - `knownHelpersOnly`
  - `strict`
  - `assumeObjects`
  - `noEscape`
  - `data`

- Only the following runtime options are supported:
  - `helpers`
  - `blockParams`
  - `data`

The [Inline partials](https://handlebarsjs.com/guide/partials.html#inline-partials) handlebars template feature is currently not supported by `@kbn/handlebars`.

## Implementation differences

The standard `handlebars` implementation:

1. When given a template string, e.g. `Hello {{x}}`, return a "render" function which takes an "input" object, e.g. `{ x: 'World' }`.
1. The first time the "render" function is called the following happens:
   1. Turn the template string into an Abstract Syntax Tree (AST).
   1. Convert the AST into a hyper optimized JavaScript function which takes the input object as an argument.
   1. Call the generate JavaScript function with the given "input" object to produce and return the final output string (`Hello World`).
1. Subsequent calls to the "render" function will re-use the already generated JavaScript function.

The custom `@kbn/handlebars` implementation:

1. When given a template string, e.g. `Hello {{x}}`, return a "render" function which takes an "input" object, e.g. `{ x: 'World' }`.
1. The first time the "render" function is called the following happens:
   1. Turn the template string into an Abstract Syntax Tree (AST).
   1. Process the AST with the given "input" object to produce and return the final output string (`Hello World`).
1. Subsequent calls to the "render" function will re-use the already generated AST.

_Note: Not parsing of the template string until the first call to the "render" function is deliberate as it mimics the original `handlebars` implementation. This means that any errors that occur due to an invalid template string will not be thrown until the first call to the "render" function._

## Technical details

The `handlebars` library exposes the API for both [generating the AST](https://github.com/handlebars-lang/handlebars.js/blob/master/docs/compiler-api.md#ast) and walking it by implementing the [Visitor API](https://github.com/handlebars-lang/handlebars.js/blob/master/docs/compiler-api.md#ast-visitor). We can leverage that to our advantage and create our own "render" function, which internally calls this API to generate the AST and then the API to walk the AST.

The `@kbn/handlebars` implementation of the `Visitor` class implements all the necessary methods called by the parent `Visitor` code when instructed to walk the AST. They all start with an upppercase letter, e.g. `MustacheStatement` or `SubExpression`. We call this class `ElasticHandlebarsVisitor`.

To parse the template string to an AST representation, we call `Handlebars.parse(templateString)`, which returns an AST object.

The AST object contains a bunch of nodes, one for each element of the template string, all arranged in a tree-like structure. The root of the AST object is a node of type `Program`. This is a special node, which we do not need to worry about, but each of its direct children has a type named like the method which will be called when the walking algorithm reaches that node, e.g. `ContentStatement` or `BlockStatement`. These are the methods that our `Visitor` implementation implements.

To instruct our `ElasticHandlebarsVisitor` class to start walking the AST object, we call the `accept()` method inherited from the parent `Visitor` class with the main AST object. The `Visitor` will walk each node in turn that is directly attached to the root `Program` node. For each node it traverses, it will call the matching method in our `ElasticHandlebarsVisitor` class.

To instruct the `Visitor` code to traverse any child nodes of a given node, our implementation needs to manually call `accept(childNode)`, `acceptArray(arrayOfChildNodes)`, `acceptKey(node, childKeyName)`, or `acceptRequired(node, childKeyName)` from within any of the "node" methods, otherwise the child nodes are ignored.

### State

We keep state internally in the `ElasticHandlebarsVisitor` object using the following private properties:

- `scopes`: An array (stack) of `context` objects. In a simple template this array will always only contain a single element: The main `context` object. In more complicated scenarios, new `context` objects will be pushed and popped to and from the `scopes` stack as needed.
- `output`: An array containing the "rendered" output of each node (normally just one element per node). In the most simple template, this is simply joined together into a the final output string after the AST has been traversed. In more complicated templates, we use this array temporarily to collect parameters to give to helper functions (see the `getParams` function).

## Development

Some of the tests have been copied from the upstream `handlebars` project and modified to fit our use-case, test-suite, and coding conventions. They are all located under the `packages/kbn-handlebars/src/upstream` directory. To check if any of the copied files have received updates upstream that we might want to include in our copies, you can run the following script:

```sh
./packages/kbn-handlebars/scripts/check_for_test_changes.sh
```

If the script outputs a diff for a given file, it means that this file has been updated.

Once all updates have been manually merged with our versions of the files, run the following script to "lock" us into the new updates:

```sh
./packages/kbn-handlebars/scripts/update_test_patches.sh
```

This will update the `.patch` files inside the `packages/kbn-handlebars/.patches` directory. Make sure to commit those changes.

_Note: If we manually make changes to our test files in the `upstream` directory, we need to run the `update_test_patches.sh` script as well._

## Debugging

### Print AST

To output the generated AST object structure in a somewhat readable form, use the following script:

```sh
./packages/kbn-handlebars/scripts/print_ast.js
```

Example:

```sh
./packages/kbn-handlebars/scripts/print_ast.js '{{value}}'
```

Output:

```js
{
  type: 'Program',
  body: [
    {
      type: 'MustacheStatement',
      path: {
        type: 'PathExpression',
        data: false,
        depth: 0,
        parts: [ 'value' ],
        original: 'value'
      },
      params: [],
      hash: undefined,
      escaped: true,
      strip: { open: false, close: false }
    }
  ],
  strip: {}
}
```

You can also filter which properties not to display, e.g:

```sh
./packages/kbn-handlebars/scripts/print_ast.js '{{#myBlock}}Hello {{name}}{{/myBlock}}' params,hash,loc,strip,data,depth,parts,inverse,openStrip,inverseStrip,closeStrip,blockParams,escaped
```

Output:

```js
{
  type: 'Program',
  body: [
    {
      type: 'BlockStatement',
      path: { type: 'PathExpression', original: 'myBlock' },
      program: {
        type: 'Program',
        body: [
          {
            type: 'ContentStatement',
            original: 'Hello ',
            value: 'Hello '
          },
          {
            type: 'MustacheStatement',
            path: { type: 'PathExpression', original: 'name' }
          }
        ]
      }
    }
  ]
}
```

### Environment variables

By default each test will run both the original `handlebars` code and the modified `@kbn/handlebars` code to compare if the output of the two are identical. When debugging, it can be beneficial to isolate a test run to just one or the other. To control this, you can use the following environment variables:

- `EVAL=1` - Set to only run the original `handlebars` implementation that uses `eval`.
- `AST=1` - Set to only run the modified `@kbn/handlebars` implementation that doesn't use `eval`.

### Print generated code

It's possible to see the generated JavaScript code that `handlebars` create for a given template using the following command line tool:

```sh
./node_modules/handlebars/print-script <template> [options]
```

Options:

- `-v`: Enable verbose mode.

Example:

```sh
./node_modules/handlebars/print-script '{{value}}' -v
```

You can pretty print just the generated function using this command:

```sh
./node_modules/handlebars/print-script '{{value}}' | \
  node -e 'process.stdin.on(`data`, c => console.log(`x=${eval(`(${eval(`(${c})`).code})`).main}`))' | \
  npx prettier --write --stdin-filepath template.js | \
  tail -c +5 | \
  npx cli-highlight -l javascript
```