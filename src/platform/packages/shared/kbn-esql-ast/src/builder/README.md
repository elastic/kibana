# Builder

Contains the `Builder` class for AST node construction. It provides the most
low-level stateless AST node construction API.

The `Builder` API can be used when constructing AST nodes from scratch manually,
and it is also used by the parser to construct the AST nodes during the parsing
process.

When parsing the AST nodes will typically have more information, such as the
position in the source code, and other metadata. When constructing the AST nodes
manually, this information is not available, but the `Builder` API can still be
used as it permits to skip the metadata.


## Usage

Construct a `literal` expression node:

```typescript
import { Builder } from '@kbn/esql-ast';

const node = Builder.expression.literal.numeric({ value: 42, literalType: 'integer' });
```

Returns:

```js
{
  type: 'literal',
  literalType: 'integer',
  value: 42,
  name: '42',

  location: { min: 0, max: 0 },
  text: '',
  incomplete: false,
}
```
