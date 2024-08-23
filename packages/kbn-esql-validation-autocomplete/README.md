# ES|QL utility library

## Folder structure

This library enables all the advanced features for ES|QL, as validation, autocomplete, hover, etc...
The package is structure as follow:

```
src
 | autocomplete         // => the autocomplete/suggest service logic
 | code_actions         // => the quick fixes service logic
 | definitions          // => static assets to define all components behaviour of a ES|QL query: commands, functions, etc...
 | validation           // => the validation logic

scripts                 // => scripts used to manage the validation engine code
```

### Basic usage

#### Validation

This module contains the validation logic useful to perform a full check of an ES|QL query string.
The validation service can be gracefully degraded leveraging the `ignoreOnMissingCallbacks` option when it is not possible to pass all callbacks: this is useful in environments where it is not possible to connect to a ES instance to retrieve more metadata, while preserving most of the validation value.
For instance, not passing the `getSources` callback will report all index mentioned in the ES|QL with the `Unknown index [...]` error, but with the `ignoreOnMissingCallbacks` option enabled this type of errors will be muted.

##### Usage

```js
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { validateQuery } from '@kbn/esql-validation-autocomplete';

// define all callbacks
const myCallbacks = {
  getSources: async () => [{name: 'index', hidden: false}],
  ...
};

// Full validation performed
const { errors, warnings } = await validateQuery("from index | stats 1 + avg(myColumn)", getAstAndSyntaxErrors, undefined, myCallbacks);
```

If not all callbacks are available it is possible to gracefully degrade the validation experience with the `ignoreOnMissingCallbacks` option:

```js
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { validateQuery } from '@kbn/esql-validation-autocomplete';

// define only the getSources callback
const myCallbacks = {
  getSources: async () => [{ name: 'index', hidden: false }],
};

// ignore errors that might be triggered by the lack of some callbacks (i.e. "Unknown columns", etc...)
const { errors, warnings } = await validateQuery(
  'from index | stats 1 + avg(myColumn)',
  getAstAndSyntaxErrors,
  { ignoreOnMissingCallbacks: true },
  myCallbacks
);
```

#### Autocomplete

This is the complete logic for the ES|QL autocomplete language, it is completely independent from the actual editor (i.e. Monaco) and the suggestions reported need to be wrapped against the specific editor shape.

```js
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { suggest } from '@kbn/esql-validation-autocomplete';

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
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { validateQuery, getActions } from '@kbn/esql-validation-autocomplete';

const queryString = "from index2 | stats 1 + avg(myColumn)"

const myCallbacks = {
  getSources: async () => [{name: 'index', hidden: false}],
  ...
};
const { errors, warnings } = await validateQuery(queryString, getAstAndSyntaxErrors, undefined, myCallbacks);

const {title, edits} = await getActions(
  queryString,
  errors,
  getAstAndSyntaxErrors,
  undefined,
  myCallbacks
);

// log the title of the fix suggestion and the proposed change
// in this example it should suggest to change from "index2" to "index"
console.log({ title, edits });
```

Like with validation also `getActions` can 'relax' its internal checks when no callbacks, either all or specific ones, are passed.

```js
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { validateQuery, getActions } from '@kbn/esql-validation-autocomplete';

const queryString = "from index2 | keep unquoted-field"

const myCallbacks = {
  getSources: async () => [{name: 'index', hidden: false}],
  ...
};
const { errors, warnings } = await validateQuery(queryString, getAstAndSyntaxErrors, undefined, myCallbacks);

const {title, edits} = await getActions(
  queryString,
  errors,
  getAstAndSyntaxErrors,
  { relaxOnMissingCallbacks: true },
  myCallbacks
);

console.log(edits[0].text); // => `unquoted-field`
```

**Note**: this behaviour is still experimental, and applied for few error types, like the unquoted fields case.

### getAstContext

This is an important function in order to build more features on top of the existing one.
For instance to show contextual information on Hover the `getAstContext` function can be leveraged to get the correct context for the cursor position:

```js
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { getAstContext } from '@kbn/esql-validation-autocomplete';

const queryString = 'from index2 | stats 1 + avg(myColumn)';
const offset = queryString.indexOf('avg');

const astContext = getAstContext(queryString, getAstAndSyntaxErrors(queryString), offset);

if (astContext.type === 'function') {
  const fnNode = astContext.node;
  const fnDefinition = getFunctionDefinition(fnNode.name);

  // show something like "avg( field: number ): number"
  console.log(getFunctionSignature(fnDefinition));
}
```

### How does it work

The general idea of this package is to provide all ES|QL features on top of a custom compact AST definition (all data structure types defined in `@kbn/esql-ast`) which is designed to be resilient to many grammar changes.
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

#### Validation

Validation takes an AST as input and generates a list of messages to show to the user.
The validation function leverages the definition files to check if the current AST is respecting the defined behaviour.
Most of the logic rely purely on the definitions, but in some specific cases some ad-hoc conditions are defined within the code for specific commands/options.
The validation test suite generates a set of fixtures at the end of its execution, which are then re-used for other test suites (i.e. some FTR integration tests) as `esql_validation_meta_tests.json`.

#### Autocomplete

The autocomplete/suggest task takes a query as input together with the current cursor position, then produces internally an AST to work with, to generate a list of suggestions for the given query.
Note that autocomplete works most of the time with incomplete/invalid queries, so some logic to manipulate the query into something valid (see the `EDITOR_MARKER` or the `countBracketsUnclosed` functions for more).

Once the AST is produced there's a `getAstContext` function that finds the cursor position node (and its parent command), together with some hint like the type of current context: `expression`, `function`, `newCommand`, `option`.
The most complex case is the `expression` as it can cover a multitude of cases. The function is highly commented in order to identify the specific cases, but there's probably some obscure area still to comment/clarify.

### Automated testing

Both the validation and autocomplete engine are covered by extensive suites of tests.

#### Running the tests

All the tests can be run using the `yarn jest:tests packages/kbn-esql-validation-autocomplete/path/to/test/file` command at the root of the repository.

To run all autocomplete and validation tests you can specifically run

`yarn test:jest packages/kbn-esql-validation-autocomplete/`

#### Ongoing refactor

The test suites are in a state of transition from an older pattern to a newer pattern and so they are more complicated than we would like. We aim to improve and simplify the DX over time.

The older pattern is

- a single test file for each engine, one for validation, one for autocomplete. These were always large files and have only grown.
- custom test methods: `testSuggestions` / `testErrorsAndWarnings`
- validation cases are recorded in a JSON file which is then used to check our results against a live Elasticsearch instance in a functional test

The newer pattern is

- splitting the tests into multiple smaller files, all found in `__tests__` directories
- standard test methods (`it`, `test`) with custom _assertion_ helpers
- validation cases are checked against Elasticsearch by injecting assertion helpers run API integration tests. This does not require a JSON file.

#### Validation

##### The new way

Validation test logic is found in `packages/kbn-esql-validation-autocomplete/src/validation/__tests__`.

Tests are found in files named with the following convention: `validation.some-description.test.ts`.

Here is an example of a block in the new test format.

```ts
describe('METRICS <sources> [ <aggregates> [ BY <grouping> ]]', () => {
  test('errors on invalid command start', async () => {
    const { expectErrors } = await setup();

    await expectErrors('m', [
      "SyntaxError: mismatched input 'm' expecting {'explain', 'from', 'meta', 'metrics', 'row', 'show'}",
    ]);
    await expectErrors('metrics ', [
      "SyntaxError: mismatched input '<EOF>' expecting {UNQUOTED_SOURCE, QUOTED_STRING}",
    ]);
  });
});
```

`expectErrors` is created in the `setup()` factory. It has a very similar API to `testErrorsAndWarnings` however it is not itself a Jest test case. It is simply an assertion that is wrapped in a test case defined with the standard `test` or `it` function.

##### The old way

The old validation tests look like this

```ts
testErrorsAndWarnings(`ROW var = NOT 5 LIKE "?a"`, [
  `Argument of [LIKE] must be [text], found value [5] type [integer]`,
]);
```

and are found in `packages/kbn-esql-validation-autocomplete/src/validation/validation.test.ts`.

`testErrorsAndWarnings` supports `skip` and `only` modifiers e.g. `testErrorsAndWarnings.only('...')`.

It accepts

1. a query
2. a list of expected errors (can be empty)
3. a list of expected warnings (can be empty or omitted)

The bulk of the validation tests are auto-generated from function definitions. All the generated function tests are found within the following describe block

```ts
describe(FUNCTION_DESCRIBE_BLOCK_NAME, () => {
  ...
});
```

They are currently generated in CI when a new function definition is added. The generator script is at `packages/kbn-esql-validation-autocomplete/scripts/generate_function_validation_tests.ts`.

The generator can be run locally using the `cd packages/kbn-esql-validation-autocomplete && yarn make:tests`.

It is not perfect and occasionally creates a test case that is invalid for a particular function. So, humans are allowed to edit the expected assertions for any test case—those edits will not be overwritten by the generator script. However, if a human deletes a test case, it will be added back next time the generator runs. So, we should edit the test cases to make them valid, not delete them.

Running the tests in `validation.test.ts` populates `packages/kbn-esql-validation-autocomplete/src/validation/esql_validation_meta_tests.json` which is then used in `test/api_integration/apis/esql/errors.ts` to make sure our validator isn't giving users false positives. Therefore, the validation test suite should always be run after any changes have been made to it so that the JSON file stays in sync.

#### Autocomplete

##### The new way

The new tests are found in `packages/kbn-esql-validation-autocomplete/src/autocomplete/__tests__`.

They look like this.

```ts
test('lists possible aggregations on space after command', async () => {
  const { assertSuggestions } = await setup();
  const expected = ['var0 = ', ...allAggFunctions, ...allEvaFunctions];

  await assertSuggestions('from a | stats /', expected);
  await assertSuggestions('FROM a | STATS /', expected);
});
```

`assertSuggestions` is created by the `setup` factory. It does not set up a Jest test case internally, so it needs to be wrapped in `test` or `it`.

The suggestion position is calculated from the placement of `/` in the query.

The arguments are as follows

1. the query
2. the expected suggestions (`Array<string | PartialSuggestionWithText>`)
3. options

Options is

```ts
export interface SuggestOptions {
  triggerCharacter?: string;
  callbacks?: ESQLCallbacks;
}
```

So, that allows you to customize the [trigger kind](https://microsoft.github.io/monaco-editor/typedoc/enums/languages.CompletionTriggerKind.html) in the `ctx` object and the field list and other callback results in `callbacks`.

##### The old way

All the legacy autocomplete tests are found in `packages/kbn-esql-validation-autocomplete/src/autocomplete/autocomplete.test.ts`.

They look like this

```ts
testSuggestions('from a | eval a = 1 year /', [
  ',',
  '| ',
  ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
    'time_interval',
  ]),
]);
```

Similarly to `testErrorsAndWarnings`, `testSuggestions` is an all-in-one utility that sets up a Jest test case internally.

Its parameters are as follows

1. the query
2. the expected suggestions (can be strings or `Partial<SuggestionRawDefinition>`)
3. the trigger character. This should only be included if the test is intended to validate a "Trigger Character" trigger kind from Monaco ([ref](https://microsoft.github.io/monaco-editor/typedoc/enums/languages.CompletionTriggerKind.html#TriggerCharacter))
4. custom callback data such as a list of indicies or a field list
