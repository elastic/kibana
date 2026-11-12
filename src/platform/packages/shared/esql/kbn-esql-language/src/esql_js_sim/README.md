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

Both packages describe the language only. How an editor presents a position (which values to
propose, snippets, spacing, ordering) stays in Kibana.
