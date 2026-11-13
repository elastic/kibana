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

Regenerate the labels after an `@elastic/esql` upgrade (from the Kibana root):

```sh
node src/platform/packages/shared/esql/kbn-esql-language/scripts/generate_grammar_labels.js
```

The generator writes plain JSON, so format the file afterwards with
`node scripts/eslint --fix <path to grammar_labels.generated.ts>`.
`grammar_labels.test.ts` fails when the checked-in table no longer matches the installed grammar.

Both packages describe the language only. How an editor presents a position (which values to
propose, snippets, spacing, ordering) stays in Kibana.
