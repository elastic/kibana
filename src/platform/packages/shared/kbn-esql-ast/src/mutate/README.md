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

- `.generic`
  - `.listCommands()` &mdash; Lists all commands. Returns an iterator.
  - `.findCommand()` &mdash; Finds a specific command by a predicate function.
  - `.findCommandOption()` &mdash; Finds a specific command option by a predicate function.
  - `.findCommandByName()` &mdash; Finds a specific command by name.
  - `.findCommandOptionByName()` &mdash; Finds a specific command option by name.
  - `.appendCommand()` &mdash; Add a new command to the AST.
  - `.appendCommandOption()` &mdash; Add a new command option to a command.
  - `.appendCommandArgument()` &mdash; Add a new main command argument to a command.
  - `.removeCommand()` &mdash; Remove a command from the AST.
  - `.removeCommandOption()` &mdash; Remove a command option from the AST.
  - `.removeCommandArgument()` &mdash; Remove a command argument from the AST.
- `.commands`
  - `.from`
    - `.sources`
      - `.list()` &mdash; List all `FROM` sources.
      - `.find()` &mdash; Find a source by name.
      - `.remove()` &mdash; Remove a source by name.
      - `.insert()` &mdash; Insert a source.
      - `.upsert()` &mdash; Insert a source, if it does not exist.
    - `.metadata`
      - `.list()` &mdash; List all `METADATA` fields.
      - `.find()` &mdash; Find a `METADATA` field by name.
      - `.removeByPredicate()` &mdash; Remove a `METADATA` field by matching a predicate function.
      - `.remove()` &mdash; Remove a `METADATA` field by name.
      - `.insert()` &mdash; Insert a `METADATA` field.
      - `.upsert()` &mdash; Insert `METADATA` field, if it does not exist.
  - `.limit`
    - `.list()` &mdash; List all `LIMIT` commands.
    - `.byIndex()` &mdash; Find a `LIMIT` command by index.
    - `.find()` &mdash; Find a `LIMIT` command by a predicate function.
    - `.remove()` &mdash; Remove a `LIMIT` command by index.
    - `.set()` &mdash; Set the limit value of a specific `LIMIT` command.
    - `.upsert()` &mdash; Insert a `LIMIT` command, or update the limit value if it already exists.
  - `.stats`
    - `.list()` &mdash; List all `STATS` commands.
    - `.byIndex()` &mdash; Find a `STATS` command by index.
    - `.summarize()` &mdash; Summarize all `STATS` commands.
    - `.summarizeCommand()` &mdash; Summarize a specific `STATS` command.


## Examples

Extract all "new" and "used" fields from all `STATS` commands:

```ts
const query = EsqlQuery.fromSrc('FROM index | STATS a = max(b), agg(c) BY d');
const summary = mutate.commands.stats.summarize(query);

console.log(summary.newFields);     // [ 'a', '`agg(c)`' ]
console.log(summary.usedFields);    // [ 'b', 'c', 'd' ]
```
