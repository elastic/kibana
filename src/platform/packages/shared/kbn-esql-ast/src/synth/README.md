# ES|QL `synth` module

The `synth` module lets you easily "synthesize" AST nodes from template strings.
This is useful when you need to construct AST nodes programmatically, but don't
want to deal with the complexity of the `Builder` class.


## Usage

You can create an assignment expression AST node as simle as:

```ts
import { synth } from '@kbn/esql-ast';

const node = synth.expr `my.field = max(10, ?my_param)`;
// { type: 'function', name: '=', args: [ ... ]}
```

To construct an equivalent AST node using the `Builder` class, you would need to
write the following code:

```ts
import { Builder } from '@kbn/esql-ast';

const node = Builder.expression.func.binary('=', [
  Builder.expression.column({
    args: [Builder.identifier({ name: 'my' }), Builder.identifier({ name: 'field' })],
  }),
  Builder.expression.func.call('max', [
    Builder.expression.literal.integer(10),
    Builder.param.named({ value: 'my_param' }),
  ]),
]);
// { type: 'function', name: '=', args: [ ... ]}
```

You can nest template strings to create more complex AST nodes:

```ts
const field = synth.expr `my.field`;
const value = synth.expr `max(10, ?my_param)`;

const assignment = synth.expr`${field} = ${value}`;
// { type: 'function', name: '=', args: [ 
//     { type: 'column', args: [ ... ] },
//     { type: 'function', name: 'max', args: [ ... ] }
// ]}
```

Use the `synth.cmd` method to create command nodes:

```ts
const command = synth.cmd `WHERE my.field == 10`;
// { type: 'command', name: 'WHERE', args: [ ... ]}
```

AST nodes created by the synthesizer are pretty-printed when you coerce them to
a string or call the `toString` method:

```ts
const command = synth.cmd ` WHERE my.field == 10 `; // { type: 'command', ... }
String(command); // "WHERE my.field == 10"
```


## Reference

### `synth.expr`

The `synth.expr` synthesizes an expression AST nodes. (*Expressions* are
basically any thing that can go into a `WHERE` command, like boolean expression,
function call, literal, params, etc.)

Use it as a function:

```ts
const node = synth.expr('my.field = max(10, ?my_param)');
```

Specify parser options:

```ts
const node = synth.expr('my.field = max(10, ?my_param)',
  { withFormatting: false });
```

Use it as a template string tag:

```ts
const node = synth.expr `my.field = max(10, ?my_param)`;
```

Specify parser options, when using as a template string tag:

```ts
const node = synth.expr({ withFormatting: false }) `my.field = max(10, 20)`;
```

Combine nodes using template strings:

```ts
const field = synth.expr `my.field`;
const node = synth.expr `${field} = max(10, 20)`;
```

Print the node as a string:

```ts
const node = synth.expr `my.field = max(10, 20)`;
String(node); // 'my.field = max(10, 20)'
```


### `synth.cmd`

The `synth.cmd` synthesizes a command AST node (such as `SELECT`, `WHERE`,
etc.). You use it the same as the `synth.expr` function or template string tag.
The only difference is that the `synth.cmd` function or tag creates a command
AST node.

```ts
const node = synth.cmd `WHERE my.field == 10`;
// { type: 'command', name: 'where', args: [ ... ]}
```
