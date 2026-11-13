# Simulated esql-js packages

This folder holds, inside Kibana, the two packages that the grammar-driven autocomplete expects
from [esql-js](https://github.com/elastic/esql-js). They live here until they can move upstream.
Each subfolder mirrors its future home, so the move is a change of import path.

| Here | Upstream | What |
| --- | --- | --- |
| `grammar/` | `@elastic/esql-grammar` | Where the cursor is, read from the grammar: the cursor locator and its result, the argument positions of every command. |
| `definitions/` | `@elastic/esql-definitions` | What each command argument means in the language: the command signatures and the entity vocabulary. |

Rules, enforced by `boundary.test.ts`:

- The folder imports nothing from Kibana. It may import `@elastic/esql*`, `antlr4` and, for its
  generators, Node built-ins.
- Kibana code imports only `grammar/index.ts` and `definitions/index.ts`, never a file below them.
- `grammar/` does not import `definitions/`. `definitions/` imports `grammar/` only through its
  `index.ts`.

What `grammar/` holds so far:

- `code_completion/`: a port of `CodeCompletionCore` from
  [antlr4-c3](https://github.com/mike-lischke/antlr4-c3) to the `antlr4` runtime that
  `@elastic/esql` uses. Given a token position, it collects the tokens and rules the grammar
  expects there.
- `grammar_labels/`: every labelled rule call of the grammar (`oldName=qualifiedNamePattern`),
  generated, with the tokens that can come right before and after it. `getCallSites` gives the
  same for any rule call, labelled or not, read from the parser at runtime.

- `cursor_location/`: the raw locator. It runs the code completion on the command around the
  cursor and returns the expected tokens and rules as the grammar names them.
- `cursor_ir/`: `locate`, the function Kibana calls. It turns the raw location into the Cursor
  IR: a description of the cursor that holds for every command.

## The Cursor IR

`locate(text, offset)` answers, from the grammar alone:

- `position`: one of a closed set (`start_of_query`, `start_of_statement`, `start_of_command`,
  `start_of_argument`, `inside_argument`, `after_argument`, `inside_string`, `inside_comment`,
  `invalid`).
- `command` and `enclosingCommands`: the grammar rule of the command around the cursor
  (`whereCommand`) and of the commands around a branch or a subquery.
- `arguments`: what can be filled in. Each has the path of call sites from the command down to
  it. A call site is `rule.label` where the grammar labels the call (`renameClause.newName`)
  and `rule>called` where it does not (`keepCommand>qualifiedNamePatterns`).
- `followers`: the tokens that can come next, each with a class (`keyword`, `operator`,
  `separator`, `opener`, `closer`, `pipe`, `terminator`, `value`, `end`) and, when it has one,
  its fixed text. The class is read from the token's text and from whether it is expected
  inside an expression rule. No token is named in the code.
- `previous` and `next`: the tokens before and after the cursor.
- `word`: the word being typed. It is any token with no fixed text (a name, a pattern, a
  number, a string) or a keyword that touches the cursor. It has a kind, whether the lexer
  reads it as a whole token, the expected keyword it spells in full, and the whole argument
  it continues (`a.b` for the word `b`).
- `onlyFollower`: the token that must come next, when nothing else can.
- `written`: what is already written in the command, as described below.

## Written arguments

`describeCommands(text)` lists the commands of a query and, for each, every argument and token
written in it: its call site (the same ids `locate` gives for what it expects), text, range,
its position among the siblings with the same call site, and the call sites above it. It reads
the parse tree only and needs no cursor, so validation can use it too.

`locate` gives the written arguments of the command around the cursor. The parser recovers
from an unfinished command by guessing, which can rearrange what was written, so `locate`
first finishes the text with a placeholder name where a value is expected and with the
brackets that are still open, and leaves out what the parser read from the added text. The
argument the cursor is in and the places above it that the cursor is still inside are marked
`open`. That is how the parameters of a lambda are known to be in scope: their lambda is open.

A command the grammar has and Kibana has not registered is located like any other.

## The table of positions

`getGrammarPositions()` lists, for every command of the grammar, each place that takes
something the user chooses: an argument (a name or a value), an expression, or a token with no
fixed text. Each has its path of call sites from the command. What an expression contains is
listed once, under `(expression)`, since it is the same for every command. The table is read
from the grammar at runtime, so it follows the installed grammar with nothing to regenerate.

The table is what the command signatures have to cover: every position of a command needs a
meaning. `locate` reports only places the table has. A rule that contains itself (a map inside
a map) makes `locate` report the same call sites once per level; `withoutRecursion(path)` folds
them to the path the table lists.

`getCommandStarts()` gives the tokens that start each command. Kibana uses them to find the
command it registered for a grammar rule, and so to tell a command it has not adopted yet.

## Command signatures (`definitions/`)

A signature says what each argument of a command is in the language. It is data: a role per
call site, in a closed schema (`signatures/types.ts`).

| Role | What the argument is |
| --- | --- |
| `column` | An existing column: accepted types, wildcards, listed once, matching a property of an entity. |
| `new_name` | A name the query introduces: a column, a subquery, a qualifier. |
| `entity` | A named thing outside the query: a source, an enrich policy, a lookup index, a setting. |
| `constant` | A literal: its type, allowed values, default, format, range. |
| `option_name` | The name of an option, with the options it conflicts with or requires. |
| `map` | A map of named parameters. |
| `expression` | An expression: its mode (scalar, aggregation, grouping, filter, constant, full text) and types. |
| `dependent_value` | A value whose role depends on the name another argument gives. |
| `parameter` | A `?name` placeholder for the whole argument. |
| `sublanguage` | Text in another language, as a PromQL query. |

- `ARGUMENT_ROLES`: the role of each argument, by call site. A role applies to everything
  below its call site that has no role of its own.
- `resolveRole(path, rule)`: the role at a place. The innermost role on the path applies. It
  takes over the fields listed in `INHERITED_FIELDS` from a role of the same thing above it:
  FROM's list says its sources may be subqueries, and each source inherits that.
- `EXPRESSION_PARTS`: what each place inside an expression is, described once for every
  command. The parameter of a lambda is a new name scoped to its lambda.
- `COMMAND_FACTS`: what the grammar leaves open and Elasticsearch requires, as "STATS needs an
  aggregation or a grouping".
- `DEFAULT_ROLES`: what a rule usually is. A command that is new in the grammar is usable with
  these before anyone describes it. `UNDESCRIBED_COMMANDS` lists the commands that still rely
  on them.

- `validateArgumentRoles(data)`: checks a table of roles that arrives as data, as JSON from
  another package would. Every field a role may have is listed, so an unknown field, kind or
  entity is reported with where it is.

## Entities (`definitions/entities`)

An entity is a named thing an argument can refer to. `ENTITY_FACTS` lists every kind with
where its values come from: the language (metadata fields, settings), the cluster (sources,
lookup indices, enrich policies, inference endpoints) or a parent entity (the fields of an
enrich policy). Two closed shapes describe the exchange with whoever lists entities:

- `EntityScope`: what narrows the entities at a place (index mode, inside a subquery, the
  parent's name, the task of an inference endpoint, serverless). A lister gets a scope and
  nothing else: no command and no query text.
- `EntityItem`: an entity as data (name, category, aliases, hidden, has children, type).

`entity_facts.test.ts` fails for a kind of entity no argument names, and for an argument that
names a child entity without depending on an argument that names its parent.

A role says only what validation could check. How an editor presents it stays in Kibana.

`signatures.test.ts` fails when a role points at a call site the grammar does not have, when a
reference between roles dangles, and when a position of a described command has no role.

To describe a command that is new in the grammar: add a role for each position the failing
test lists, and remove the command from `UNDESCRIBED_COMMANDS`.

Regenerate the labels after an `@elastic/esql` upgrade (from the Kibana root):

```sh
node src/platform/packages/shared/esql/kbn-esql-language/scripts/generate_grammar_labels.js
```

The generator writes plain JSON, so format the file afterwards with
`node scripts/eslint --fix <path to grammar_labels.generated.ts>`.
`grammar_labels.test.ts` fails when the checked-in table no longer matches the installed grammar.

Both packages describe the language only. How an editor presents a position (which values to
propose, snippets, spacing, ordering) stays in Kibana.
