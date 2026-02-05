# ES|QL `synth` module

The `synth` module lets you easily "synthesize" AST nodes from template strings.
This is useful when you need to construct AST nodes programmatically, but don't
want to deal with the complexity of the `Builder` class.

## Usage

You can synthesize a whole query AST node using the `qry` template tag:

```ts
import { synth } from '@kbn/esql-language';

const node = synth.qry`FROM index | WHERE my.field == 10`;
// { type: 'query', commands: [ ... ]}
```

However, the synth API allows you to be more granular and create
individual expression or command AST nodes.

You can create an assignment expression AST node as simple as:

```ts
import { synth } from '@kbn/esql-language';

const node = synth.exp`my.field = max(10, ?my_param)`;
// { type: 'function', name: '=', args: [ ... ]}
```

To construct an equivalent AST node using the `Builder` class, you would need to
write the following code:

```ts
import { Builder } from '@kbn/esql-language';

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
const field = synth.exp`my.field`;
const value = synth.exp`max(10, ?my_param)`;

const assignment = synth.exp`${field} = ${value}`;
// { type: 'function', name: '=', args: [
//     { type: 'column', args: [ ... ] },
//     { type: 'function', name: 'max', args: [ ... ] }
// ]}
```

Use the `cmd` tag to create command nodes:

```ts
const command = synth.cmd`WHERE my.field == 10`;
// { type: 'command', name: 'WHERE', args: [ ... ]}
```

AST nodes created by the synthesizer are pretty-printed when you coerce them to
a string or call the `toString` method:

```ts
const command = synth.cmd` WHERE my.field == 10 `; // { type: 'command', ... }
String(command); // "WHERE my.field == 10"
```

## Reference

### `synth.exp`

The `synth.exp` synthesizes an expression AST nodes. (_Expressions_ are
basically any thing that can go into a `WHERE` command, like boolean expression,
function call, literal, params, etc.)

Use it as a function:

```ts
const node = synth.exp('my.field = max(10, ?my_param)');
```

Specify parser options:

```ts
const node = synth.exp('my.field = max(10, ?my_param)', { withFormatting: false });
```

Use it as a template string tag:

```ts
const node = synth.exp`my.field = max(10, ?my_param)`;
```

Specify parser options, when using as a template string tag:

```ts
const node = synth.exp({ withFormatting: false })`my.field = max(10, 20)`;
```

Combine nodes using template strings:

```ts
const field = synth.exp`my.field`;
const node = synth.exp`${field} = max(10, 20)`;
```

Print the node as a string:

```ts
const node = synth.exp`my.field = max(10, 20)`;
String(node); // 'my.field = max(10, 20)'
```

### `synth.cmd`

The `cmd` tag synthesizes a command AST node (such as `SELECT`, `WHERE`,
etc.). You use it the same as the `exp` tag. The only difference is that the
`cmd` tag creates a command AST node.

```ts
const node = synth.cmd`WHERE my.field == 10`;
// { type: 'command', name: 'where', args: [ ... ]}
```

### `synth.hdr`

The `hdr` tag synthesizes a header command AST node (such as `SET`). You use it
the same as the `exp` and `cmd` tags. The only difference is that the `hdr` tag
creates a header command AST node.

```ts
const node = synth.hdr`SET param = "value"`;
// { type: 'header-command', name: 'set', args: [ ... ]}
```

### `synth.qry`

The `qry` tag synthesizes a query AST node. Otherwise, it works the same as the
`exp` and `cmd` tags.

```ts
const node = synth.qry`FROM index | WHERE my.field == 10`;
// { type: 'query', commands: [ ... ]}
```
