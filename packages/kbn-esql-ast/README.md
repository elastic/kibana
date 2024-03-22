# ES|QL utility library

## Folder structure

This library enables all the advanced features for ES|QL within Monaco, as validation, autocomplete, hover, etc...
The package is structure as follow:

```
src
|- antlr                        // => contains the ES|QL grammar files and various compilation assets
|- lib
|   |- ast
|   |    | autocomplete         // => the autocomplete/suggest service logic
|   |    | code_actions         // => the quick fixes service logic
|   |    | definitions          // => static assets to define all components behaviour of a ES|QL query: commands, functions, etc...
|   |    | validation           // => the validation logic
|   |    ast_factory.ts         // => binding to the Antlr that generates the AST data structure
|   |    ast_errors.ts          // => error translation utility from raw Antlr to something understandable (somewhat)
|   |    ...                    // => miscellaneas utilities to work with AST
|   |- monaco                   // => some high level interfaces to work with
|   |   | esql_ast_provider.ts  // => the API to work with validation, autocomplete, etc... 
|   |   | ...
|   antlr_error_listener.ts     // => The ES|QL syntax error listener
|   antlr_facade.ts             // => getParser and getLexer utilities
```

### Basic usage

#### Validation

This module contains a low level validation logic useful to perform a full check of an ES|QL query string.
While callbacks argument is optional in this function, the logic will not skip checks based on those, rather report all errors
considering the lack of information as an empty set of values.
For instance, not passing the `getSources` callback will report all index mentioned in the ES|QL with the `Unknown index [...]` error.
It is recommended to use the `validate` function from the `@kbn/esql-validation` package who is more lenient about lack of callbacks.

##### Usage

```js
import { validateAst, getAstAndSyntaxErrors } from '@kbn/esql-services';

const myCallbacks = {
  getSources: async () => [{name: 'index', hidden: false}],
  ...
};
const { errors, warnings } = await validateAst("from index | stats 1 + avg(myColumn)", getAstAndSyntaxErrors, myCallbacks);
```

#### Autocomplete

This is the complete logic for the ES|QL autocomplete language, it is completely indipendent from the actual editor (i.e. Monaco) and the suggestions reported need to be wrapped against the specific editor shape.

```js
import { suggest, getAstAndSyntaxErrors } from '@kbn/esql-services';

const queryString = "from index | stats 1 + avg(myColumn) ";
const myCallbacks = {
  getSources: async () => [{name: 'index', hidden: false}],
  ...
};

const suggestions = await suggest(
  queryString,
  queryString.length - 1, // the cursor position in a single line context
  { triggerCharacter: " "; triggerKind: 1 }, // kind = 0 is a programmatic trigger, while other values are ignored
  getAstAndSyntaxErrors,
  myCallbacks
);

// Log the actual text to be injected as suggestion
console.log(suggestions.map(({text}) => text));

// for Monaco editor it is required to map each suggestion with the editor specific type
suggestions.map( s => ({
  label: s.label,
  insertText: s.text,
  insertTextRules: asSnippet
        ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        : undefined,
  ...
  }))
```

Note that the autocomplete service will work as best effort with invalid queries, trying to correct them on the fly before generating the suggestions. In case an invalid query cannot be handled an empty suggestion result set will be returned.

#### Quick fixes

This feature provides a list of suggestions to propose as fixes for a subset of validation errors.
The feature works in combination with the validation service.

```js
import { validateAst, getAstAndSyntaxErrors, getActions } from '@kbn/esql-services';

const queryString = "from index2 | stats 1 + avg(myColumn)"

const myCallbacks = {
  getSources: async () => [{name: 'index', hidden: false}],
  ...
};
const { errors, warnings } = await validateAst(queryString, getAstAndSyntaxErrors, myCallbacks);

const {title, edits} = await getActions(
  queryString,
  errors,
  getAstAndSyntaxErrors,
  myCallbacks
);

// log the title of the fix suggestion and the proposed change
// in this example it should suggest to change from "index2" to "index"
console.log({ title, edits });
```

### getAstContext

This is an important function in order to build more features on top of the existing one.
For instance to show contextual information on Hover the `getAstContext` function can be leveraged to get the correct context for the cursor position:

```js
import { getAstContext, getAstAndSyntaxErrors } from '@kbn/esql-services';

const queryString = "from index2 | stats 1 + avg(myColumn)";
const offset = queryString.indexOf("avg");

const astContext = getAstContext(queryString, getAstAndSyntaxErrors(queryString), offset);

if(astContext.type === "function"){
  const fnNode = astContext.node;
  const fnDefinition = getFunctionDefinition(fnNode.name);

  // show something like "avg( field: number ): number"
  console.log(getFunctionSignature(fnDefinition));
}
```


### How does it work

The general idea of this package is to provide all ES|QL features on top of a custom compact AST definition (all data structure types defined in `./ast/types.ts`) which is designed to be resilient to many grammar changes.
The pipeline is the following:

```
Antlr grammar files
=> Compiled grammar files (.ts assets in the antlr folder)
=> AST Factory (Antlr Parser tree => custom AST)
=> featureFn( AST, Definitions, ESQLCallbacks )
```

Each feature function works with the combination of the AST and the definition files: the former describe the current statement in a easy to traverse way, while the definitions describe what's the expected behaviour of each node in the AST node (i.e. what arguments should it accept? How many arguments? etc...).
ESQLCallbacks are a set of utilities to retrieve context metadata like fields/index/policies list and policies metadata.

While AST requires the grammar to be compiled to be updated, definitions are static files which can be dynamically updated without running the ANTLR compile task.

#### AST

The AST is generated by 2 files: `ast_factory.ts` and its buddy `ast_walker.ts`:
* `ast_factory.ts` is a binding to Antlr and access the Parser tree
* Parser tree is passed over to `ast_walker` to append new AST nodes

In general Antlr is resilient to grammar errors, in the sense that it can produe a Parser tree up to the point of the error, then stops. This is useful to perform partial tasks even with broken queries and this means that a partial AST can be produced even with an invalid query.

#### Validation

Validation takes an AST as input and generates a list of messages to show to the user.
The validation function leverages the definition files to check if the current AST is respecting the defined behaviour.
Most of the logic rely purely on the definitions, but in some specific cases some ad-hoc conditions are defined within the code for specific commands/options.
The validation test suite generates a set of fixtures at the end of its execution, which are then re-used for other test suites (i.e. `@kbn/esql-validation` and some FTR integration tests) as `esql_validation_meta_tests.json`.

#### Autocomplete

The autocomplete/suggest task takes a query as input together with the current cursor position, then produces internally an AST to work with, to generate a list of suggestions for the given query.
Note that autocomplete works most of the time with incomplete/invalid queries, so some logic to manipulate the query into something valid (see the `EDITOR_MARKER` or the `countBracketsUnclosed` functions for more).

Once the AST is produced there's a `getAstContext` function that finds the cursor position node (and its parent command), together with some hint like the type of current context: `expression`, `function`, `newCommand`, `option`.
The most complex case is the `expression` as it can cover a moltitude of cases. The function is highly commented in order to identify the specific cases, but there's probably some obscure area still to comment/clarify.

### Keeping ES|QL up to date

In general when operating on changes here use the `yarn kbn watch` in a terminal window to make sure changes are correctly compiled.

#### How to add new functions

A CI job is already present in Kibana to automatically sync most functions based on the ES implementation (it relies on the `META FUNCTIONS` command in ES|QL).
When a new function is added to ES|QL, this can be of one of these types:

* Built-in function (+, -, in, like, etc...)
* Aggregation type (`STATS` only)
* Math type (`EVAL`, `WHERE`, etc...)

For each function type there's a specific file to update within the `definitions` folder:
* Built-in function => `builtin.ts`
* Aggregation type => `aggs.ts`
* Math type => `functions.ts`

All function definitions are of the `FunctionDefinition` type and it's quite easy to add new ones.

While validation tests for Aggregation and Math type will be automatically generated, for the Built-in type new tests needs to be added for both validation and autocomplete.

#### How to add new commands/options

When a new command/option is added to ES|QL it is done via a grammar update.
Therefore adding them requires a two step phase:
* Update the grammar with the new one
    * add/fix all AST generator bindings in case of new/changed TOKENS in the `lexer` grammar file
* Update the definition files for commands/options

To update the grammar:
1. start by copying the source grammar `lexer` and `parser` files
2. make sure to fix all the case insensitive occurrencies in `lexer` file (all non-symbol strings like `"something"` into `S O M E T H I N G`).
3. run the script into the `package.json` to compile the ES|QL grammar.
4. open the `ast_factory.ts` file and add a new `exit<Command/Option>` method
5. write some code in the `ast_walker/ts` to translate the Antlr Parser tree into the custom AST (there are already few utilites for that, but sometimes it is required to write some more code if the `parser` introduced a new flow)
  * pro tip: use the `http://lab.antlr.org/` to visualize/debug the parser tree for a given statement (copy and paste the grammar files there)
6. if a new quoted/unquoted identifier token gets added open the `ast_helpers.ts` and manually add the ids of the new tokens in the `getQuotedText` and `getUnquotedText` functions - please make sure to leave a comment on the token name

To update the definitions:
1. open either the `commands.ts` or `option.ts` file and add a new entry
2. write new tests for validation and autocomplete

#### Debug and fix grammar changes (tokens, etc...)

On TOKEN renaming or with subtle `lexer` grammar changes it can happens that test breaks, this can be happen for two main issues:
* A TOKEN name changed so the `ast_walker.ts` doesn't find it any more. Go there and rename the TOKEN name.
* TOKEN order changed and tests started failing. This probably generated some TOKEN id reorder and there are two functions in `ast_helpers.ts` who rely on hardcoded ids: `getQuotedText` and `getUnquotedText`.
  * Note that the `getQuotedText` and `getUnquotedText` are automatically updated on grammar changes detected by the Kibana CI sync job.
  * to fix this just look at the commented tokens and update the ids. If a new token add it and leave a comment to point to the new token name.
  * This choice was made to reduce the bundle size, as importing the `esql_parser` adds some hundreds of Kbs to the bundle otherwise.