# Autocomplete v2

The grammar-driven autocomplete engine, built next to the current flow in `../autocomplete`. Both
export a `suggest` with the same signature. The package exports one of them from
`../index.ts`, so switching flows is one line.

The engine knows no command. A command gets its suggestions from the grammar position of the
cursor and from the command signatures in `../../esql_js_sim`. Rules, enforced by
`boundary.test.ts`:

- No import from a command's folder under `commands/registry/`.
- No command name and no grammar rule name of a command (`whereCommand`) as a string.
- A provider override is the only exception. It is keyed by an argument, never by a command,
  it is listed in `overrides.ts`, and the list may grow only with an owner and an issue.

## The four steps

`suggest(fullText, offset, callbacks)` has the signature of the current flow's `suggest`.

1. **Locate** (`esql_js_sim/grammar`): where the cursor is in the grammar.
2. **Resolve** (`resolve.ts`): what has to be offered there, as a list of requests. A request
   is a kind of thing: the names of commands, a token, the end of the command, an argument
   with its role, an expression with its role. It is pure: nothing is fetched.
3. **Provide** (`providers/`): the items for each request. A provider is chosen by the kind of
   the request and knows the editor only through the context (`context.ts`).
4. **Present** (in `suggest.ts` for now): the final list.

What the engine offers today:

- Command names, with the license, tier, time-series and "hidden after" gates of the
  registered commands.
- Keywords, the pipe, the separator of a list and the next line.
- Arguments with the roles `column` (by type, each listed once where the role says so),
  `new_name` (a free name with its assignment), `constant` (its allowed values), `entity`,
  `map` (the keys not used yet, and the values of the key before the cursor), `option_name`
  (the options not used and not in conflict with a used one) and `dependent_value` (the role
  the name gives it, listed in the signature or defined by the named entity).
- Expressions, by the mode and the types of their role. Sublanguages are resolved and not
  provided yet.

Inside an open string only a value is offered: the value of a map key or a constant.

An expression is one request, whatever the cursor is nested in: its operands, its operators,
its brackets and the arguments of its functions are offered together
(`providers/expressions.ts`). The items come from the expression engine the commands of the
current flow share. The provider tells that engine what the role and the grammar know:

- which functions and operators apply, from the mode of the role (and the roles around it: a
  filter inside an aggregation);
- the types the role accepts, whether subqueries may appear, where full-text functions may;
- what is written of the expression: the grammar gives where it starts, and the node of the
  syntax tree that starts there is handed over.

While something is written that is not yet a whole expression of the type its role asks for,
the command cannot go on: no pipe, no keyword and no separator of the command is offered.

A lambda (`v -> v > 1`) is part of an expression (`providers/lambdas.ts`). The grammar allows
one as any argument of any function; which argument takes one is a fact of the function
(`FUNCTION_LAMBDAS` in the definitions, empty until a function Kibana knows declares one):

- where that argument starts, only the parameters with the arrow are offered (`x -> `), with
  names the query does not use; after a parameter's name, only the arrow;
- in the body, the parameters of every lambda around the cursor are offered next to the
  columns, and nowhere else. A parameter has the type of the argument whose values it stands
  for, when the function says which (`valuesOf`);
- the body is offered as the value of the argument: the expression engine does not know
  lambdas, so it reads the text with the parameters and the arrow blanked out.

Two things are still borrowed from the current flow here, and go away when the expression
engine reads the grammar position itself: the syntax tree of the command at the cursor, and
the names the function definitions use for the places a function is allowed in.

Entities come from `entities/registry.ts`: one definition per kind, each turning what the
editor provides today into entities, in a scope. The scope is all a definition gets: the index
mode, the parent's name, the task, serverless. `providers/entities.ts` builds the scope from
the role and from what is written (the policy an enrich field depends on), and presents the
entities. The editor's callbacks are unchanged.

The columns a command can read are those of the query before the cursor (`pipeline.ts`): the
commands before it in its pipeline, plus the outer pipeline for a branch, and only the
subquery's own commands for a subquery. They are fetched on the first request, so a position
that offers no column asks the editor for none.

An item for an argument ends with a space, and reopens the suggestions, unless the argument is
an item of a list. There a separator can follow, and it is offered on the name itself.

`__tests__/scenarios/parity.test.ts` runs every scenario table through this flow and keeps,
in a snapshot, how many rows of each command already match the current flow.

What is here so far:

- `command_metadata.ts`: `getRegisteredCommand(commandRule)`, the one function through which
  the engine reads what Kibana registered for a command. It is undefined for a command that
  is in the grammar and that Kibana has not adopted.
- `command_metadata.test.ts`: the snapshot of every position of the registered commands, and
  the list of commands Kibana has not registered. A grammar upgrade shows up as a change here.
- `locate_examples.test.ts`: runs `locate` at every token boundary of the registered command
  examples.
- `signature_coverage.test.ts`: the gate for a new command. A command Kibana registers must
  be described, and every position it has must get its role from a signature.
- `entities/types.ts`: `EntityDefinition`, how the entities of one kind are listed from the
  editor's callbacks, and `EntityRegistry`, one definition per kind. The registry itself comes
  with the engine.
- `suggest.test.ts`: the engine's own tests, by kind of request and not by command.
