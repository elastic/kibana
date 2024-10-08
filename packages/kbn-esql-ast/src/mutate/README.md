# Mutation API

The ES|QL mutation API provides methods to navigate and modify the AST.


## Usage

For example, insert a `FROM` command `METADATA` field:

```typescript
import { parse, mutate, BasicPrettyPrinter } from '@elastic/esql';

const { root } = parse('FROM index METADATA _lang');

console.log([...mutate.commands.from.metadata.list(root)]); // [ '_lang' ]

mutate.commands.from.metadata.upsert(root, '_id');

console.log([...mutate.commands.from.metadata.list(root)]); // [ '_lang', '_id' ]

const src = BasicPrettyPrinter.print(root);

console.log(src); // FROM index METADATA _lang, _id
```


## API

- `.commands.from.metadata.list()` &mdash; List all `METADATA` fields.
- `.commands.from.metadata.find()` &mdash; Find a `METADATA` field by name.
- `.commands.from.metadata.removeByPredicate()` &mdash; Remove a `METADATA`
  field by matching a predicate.
- `.commands.from.metadata.remove()` &mdash; Remove a `METADATA` field by name.
- `.commands.from.metadata.insert()` &mdash; Insert a `METADATA` field.
- `.commands.from.metadata.upsert()` &mdash; Insert `METADATA` field, if it does
  not exist.
