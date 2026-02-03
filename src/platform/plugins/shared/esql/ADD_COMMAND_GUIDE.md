# Adding Support for a New ES|QL Command in Kibana

## Overview

Integrating a new ES|QL command into Kibana’s editor requires you to modify the codebase in several places. This guide aims to gather all the required changes in one place. For detailed explanations of the inner workings of each package, you will be linked to its README.

Seamlessly integrating a new command involves:

- [ ] Supporting a new node in the ES|QL abstract syntax tree (AST)
- [ ] Validating that the command works well when prettifying the query
- [ ] Creating the command definition
- [ ] Adding logic to simulate any changes the command makes to the column list
- [ ] Adding the corresponding client-side validations
- [ ] Adding the autocomplete suggestions
- [ ] Supporting the new command in the syntax highlighting libraries

## Add AST support

We use a custom AST as a helper to support the rest of the capabilities listed in this document. Therefore, the first step is to create a new node in the tree when parsing the new command.

- [ ] Make sure that the new command is in the local Kibana grammar definition. The ANTLR lexer and parser files are updated every Monday from the source definition of the language at Elasticsearch (via a manually merged, automatically generated [PR](https://github.com/elastic/kibana/pull/213006)).
- [ ] Create a factory for generating the new node. The new node should satisfy the `ESQLCommand<Name>` interface. If the syntax of your command cannot be decomposed only in parameters, you can hold extra information by extending the `ESQLCommand` interface. I.E., check the Rerank command.
- [ ] ANTLR creates a data structure called a _concrete syntax tree_. From that tree, we create our _abstract syntax tree_ which is used everywhere else in our code. You need to add support for your new command to our AST by adding a `from<commandname>Command` method to the `CstToAstConverter` class (found in `kbn-esql-language/src/parser/cst_to_ast_converter.ts`). You then call that new method in `CstToAstConverter.fromProcessingCommand` (for most commands). There are many examples.
- [ ] Create unit tests checking that the correct AST nodes are generated when parsing your command. In many cases, it also makes sense to verify behavior of incomplete command syntax since the parser will encounter this while a user is editing a query.
- [ ] Add a dedicated [visitor callback](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-esql-language/src/visitor/README.md) for the new command.
- [ ] Verify that the `Walker` API can visit the new node.
- [ ] Verify that the `Synth` API can construct the new node.

### Example PR’s ⭐

[FORK command](https://github.com/elastic/kibana/pull/216743).

## Verify prettifying behavior

[Pretty-printing](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-esql-language/src/pretty_print/README.md) is the process of converting an ES|QL AST into a human-readable string. This is useful for debugging or for displaying the AST to the user.

Depending on the command you are adding, it may be required or not to do an adjustment.

- [ ] Validate that the prettifier works correctly.
- [ ] Adjust the basic pretty printer and the wrapping pretty printer if needed.
- [ ] Add unit tests validating that the queries are correctly formatted (even if no adjustment has been done).

### Example PR’s ⭐

[FORK command](https://github.com/elastic/kibana/pull/216743/files#diff-b4a14d3c1f4ce04db1f706548871db4d89fc99666d9c179b1b9e4af52069172b).

## Create the command definition

We need to register the new command in the `kbn-esql-language` [package](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-esql-language/README.md) in order to activate the autocomplete and validation features.

All commands are registered in our commands registry. Read [the doc](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-esql-language/src/commands/registry/README.md) for context.

- [ ] First, create a new folder with the same name as the command under `kbn-esql-language/src/commands/registry/commands`. This will house all command logic that gets sent to the registry.
- [ ] Create an `index.ts` file within the folder. This is where you create your command definition (`ICommand`).

  If the command is not ready to be advertised, use `hidden: true`.

  If the command is available in a technical preview, use `preview: true`.

  If the command is ready for GA, don’t use either of the above properties.

- [ ] Import your new command definition in `commands/registry/index.ts`.

If you get stuck, check the many examples in `commands/registry/commands`.

### Example ⭐

```ts
// (will add these methods in the next steps)
const dissectCommandMethods: ICommandMethods<ICommandContext> = {
  validate,
  autocomplete,
  columnsAfter,
};

export const dissectCommand = {
  name: 'dissect',
  methods: dissectCommandMethods,
  metadata: {
    description: i18n.translate('kbn-esql-language.esql.definitions.dissectDoc', {
      defaultMessage:
        'Extracts multiple string values from a single string input, based on a pattern',
    }),
    declaration: 'DISSECT input "pattern" [APPEND_SEPARATOR="<separator>"]',
    examples: ['… | DISSECT a "%{b} %{c}" APPEND_SEPARATOR = ":"'],
  },
};
```

## Define column list behavior

All `ES|QL` commands modify a table of query results. Many of the commands affect which columns are available after them. For example, `DROP` removes columns while `EVAL` allows the user to define new columns.

This behavior happens in Elasticsearch, but we also simulate it in our code to provide accurate validation errors and column suggestions.

If your command adds or drops columns from the table, you need to define a `columnsAfter` method and attach it to your command definition.

- [ ] Create and export a function, `columnsAfter` within a new module in your command's directory.
- [ ] Attach it to your command definition.
- [ ] Implement logic to modify the list of available columns according to the command's behavior. <br>**NOTE:** we distinguish between "fields" which are not defined within the text of the query, and "user-defined columns" which are. Make sure to use the correct type when adding a column to the list.
- [ ] Create a test suite in the same directory to validate the new `columnsAfter` method.

### Example ⭐

```ts
export const columnsAfter = (command: ESQLCommand, previousColumns: ESQLColumnData[]) => {
  const columnsToDrop: string[] = [];

  walk(command, {
    visitColumn: (node) => {
      columnsToDrop.push(node.parts.join('.'));
    },
  });

  return previousColumns.filter((field) => {
    // if the field is not in the columnsToDrop, keep it
    return !columnsToDrop.some((column) => column === field.name);
  });
};
```

## Add validation

Each command definition is responsible for validating the AST command nodes of that type. In other words, the `STATS` command definition's `validate` method will be invoked everytime the validator sees a command AST node with the name `stats`.

There is a validation function called `validateCommandArguments` that performs some basic checks such as column existence and function validation. It may or may not do the right thing for your command, but most command validate methods call it on at least a subset of their arguments.

- [ ] Create and export a validate method from a module within the command's directory.
- [ ] Attach it as the validate method on the command definition.
- [ ] Fill out the validate function
  - [ ] Probably call `validateCommandArguments` on the command AST
  - [ ] Optionally, add command-specific validation, but only _sparingly_. Our validation is, by design, incomplete. Really consider whether the UX value of each check is worth the complexity it introduces. If a command requires a field of a certain type as an argument, that is an appropriate check.
- [ ] Add a suite of validation tests within the command's directory. Check the many examples for help.

**NOTE**: all new validation messages should be registered in the `getMessageAndTypeFromId` function. It is also often a good idea to create a convenience method for a new message on our simplified API, `errors`. See `kbn-esql-language/src/definitions/utils/errors.ts`.

### Example ⭐

```ts
export const validate = (
  command: ESQLCommand,
  ast: ESQLAst,
  context?: ICommandContext,
  callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  // custom check specific to FORK
  if (command.args.length < MIN_BRANCHES) {
    messages.push(errors.forkTooFewBranches(command));
  }

  // custom check specific to FORK
  if (command.args.length > MAX_BRANCHES) {
    messages.push(errors.forkTooManyBranches(command));
  }

  // some generic validation
  messages.push(...validateCommandArguments(command, ast, context, callbacks));
  ...
}
```

## Add autocomplete

Define what are the keywords you want to be suggested when the cursor is positioned at the new command.

You can read how suggestions work [here](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-esql-language/README.md#autocomplete-1).

- [ ] Add the suggestions to be shown when **positioned at** the new command.

  - [ ] Create and export an `autocomplete` function for your command in a separate module in the command's directory. This function will return an array of suggestions.
        <br/><br/>
        **Example** ⭐ of suggestions for the WHERE command:

    ```ts
    export async function autocomplete(
      query: string,
      command: ESQLCommand,
      callbacks?: ICommandCallbacks,
      context?: ICommandContext,
      cursorPosition?: number
    ): Promise<ISuggestionItem[]> {
      if (!callbacks?.getByType) {
        return [];
      }
      const innerText = query.substring(0, cursorPosition);
      const expressionRoot = command.args[0] as ESQLSingleAstItem | undefined;
      const suggestions = await suggestForExpression({
        innerText,
        getColumnsByType: callbacks.getByType,
        expressionRoot,
        location: Location.WHERE,
        preferredExpressionType: 'boolean',
        context,
        hasMinimumLicenseRequired: callbacks?.hasMinimumLicenseRequired,
        activeProduct: context?.activeProduct,
      });

      // Is this a complete boolean expression?
      // If so, we can call it done and suggest a pipe
      const expressionType = getExpressionType(expressionRoot, context?.columns);
      if (expressionType === 'boolean' && isExpressionComplete(expressionType, innerText)) {
        suggestions.push(pipeCompleteItem);
      }

      return suggestions;
    }
    ```

  - [ ] Add a test suite following the examples in the other commands.

### Important things to check when adding suggestions

- **Partial words** — suggestions should work after partial words. For example `SORT field AS/` should suggest the same list of options as `SORT field /` (where `/` is the cursor position). Otherwise, users won't get suggestions if they resume typing words.
- **Lists of things** — All field lists (and source and other lists where appropriate) should follow the pattern found in `KEEP`. That is, they should differentiate between partial and complete list item names and show the comma suggestion after a complete name without advancing the cursor by a space. There is a `handleFragment` function to assist with this. If we get this wrong, the editor awkwardly inserts commas surrounded by whitespace.
- **Prefix ranges** — When a suggestion is chosen, Monaco computes a prefix range to replace with the text of the completion item. Sometimes, Monaco's default prefix detection is inadequate, leading the editor to insert the suggestion text at the wrong location. This happens when a prefix can contain one of VSCode's [default word separator characters](https://github.com/microsoft/vscode/blob/1c931b181d6922ddc1eac2469117fba2c500da07/src/vs/editor/common/core/wordHelper.ts#L10). A classic ES|QL example is accepting a suggestion for a dotted field name (e.g. `foo.bar.baz`) _when the suggestions have been generated after the dot (e.g. `foo.ba/`)._ The best way to make sure things work is manual testing in the editor.

  1. type something like the following: `WHERE foo.ba` so that you have a prefix with a dot in it.
  1. close the suggestion menu by pressing `ESC`
  1. resume typing where you left off to generate suggestions again
  1. then accept a suggestion

  If the editor is inserting the text incorrectly, you need to calculate and attach a custom [`rangeToReplace`](https://github.com/elastic/kibana/blob/f09bce1108cdd55ba69e11e8b14c947bf052dd91/src/platform/packages/shared/kbn-esql-language/src/autocomplete/types.ts#L64-L75) that covers the entire prefix. Once you have verified the behavior manually, you can add an automated test to check the computed range ([example](https://github.com/elastic/kibana/blob/3962e0fb2a7b833a21b33012b2425fa847e48bcb/src/platform/packages/shared/kbn-esql-language/src/autocomplete/__tests__/autocomplete.command.sort.test.ts#L240)). (We may be able to find [a more automatic way](https://github.com/elastic/kibana/issues/209905) to ensure correct behavior in the future, but for now, it's manual.)

### A note on regular expressions (regex) in autocomplete

Our strategy is to use the AST in our autocomplete code whenever it makes sense. It is our ground source of truth.

However, we often deal with incomplete (i.e. syntactically-incorrect) queries. The AST is primarily designed to work with correct queries. It

- may have nodes missing in some syntactically incorrect scenarios
- may add a node, but mark it as `incomplete: true`
- doesn't always include relevant formatting information such as whether the incomplete query ends with a comma or not

This leads to many cases that can't be covered with just the AST. For these cases, we often employ regex checks on a portion of the query string. Regex-based checks can be written to be very robust to things like varying amounts of whitespace, case sensitivity, and repetition. We recommend brushing up on Javascript regex syntax.

In particular, we often use

- the `$` character to force the regex to match characters at the end of the line. This prevents false positives when the pattern may be present in a previous command in the query. For example `/,\s*/` will match _any comma in the query_, but `/,\s*$/` will match only a comma just before the cursor position.
- the `\s` character group marker. This matches any whitespace including spaces, tabs, and newlines, making it cover lots of cases.
- the `i` flag to turn off case sensitivity. For example, `/stats/i` matches `stats`, `STATS`, `StAtS` and so on.

When in doubt, AI tools and [Regexr](https://regexr.com) are great sources of help.

## Add syntax highlighting

Currently, we support 3 highlighting libraries: Monaco, HighlightJS, and PrismJS. We should update them when adding new commands.

- [ ] Add command to [prismjs-esql](https://github.com/elastic/prismjs-esql) | [npm](https://www.npmjs.com/package/@elastic/prismjs-esql)
  - [ ] [Release](https://github.com/elastic/eui) a new version
- [ ] Add command to [monaco-esql](https://github.com/elastic/monaco-esql) | [npm](https://www.npmjs.com/package/@elastic/monaco-esql)
  - [ ] [Release](https://github.com/elastic/monaco-esql?tab=readme-ov-file#releasing) a new version
- [ ] Add command to [highlightjs-esql](https://github.com/elastic/highlightjs-esql) | [npm](https://www.npmjs.com/package/@elastic/highlightjs-esql)
  - [ ] [Release](https://github.com/elastic/monaco-esql?tab=readme-ov-file#releasing) a new version
- [ ] Update [EUI’s](https://github.com/elastic/eui) prismjs-esql version
  - [ ] `yarn upgrade @elastic/prismjs-esql@<version>`
- [ ] Update Kibana monaco-esql version
  - [ ] `yarn upgrade @elastic/monaco-esql@<version>`

### Example PR’s ⭐

[Prismjs-esql](https://github.com/elastic/prismjs-esql/pull/3)

[Monaco-esql](https://github.com/elastic/monaco-esql/pull/4)

[Highlightjs-esql](https://github.com/elastic/highlightjs-esql/pull/4)

[update eui](https://github.com/elastic/eui/pull/8587)

[update Kibana](https://github.com/elastic/kibana/pull/220378)
