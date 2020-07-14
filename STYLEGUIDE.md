# Kibana Style Guide

This guide applies to all development within the Kibana project and is
recommended for the development of all Kibana plugins.

- [General](#general)
- [HTML](#html)
- [API endpoints](#api-endpoints)
- [TypeScript/JavaScript](#typeScript/javaScript)
- [SASS files](#sass-files)
- [React](#react)

Besides the content in this style guide, the following style guides may also apply
to all development within the Kibana project. Please make sure to also read them:

- [Accessibility style guide (EUI Docs)](https://elastic.github.io/eui/#/guidelines/accessibility)
- [SASS style guide (EUI Docs)](https://elastic.github.io/eui/#/guidelines/sass)

## General

### Filenames

All filenames should use `snake_case`.

**Right:** `src/kibana/index_patterns/index_pattern.js`

**Wrong:** `src/kibana/IndexPatterns/IndexPattern.js`

### Do not comment out code

We use a version management system. If a line of code is no longer needed,
remove it, don't simply comment it out.

### Prettier and Linting

We are gradually moving the Kibana code base over to Prettier. All TypeScript code
and some JavaScript code (check `.eslintrc.js`) is using Prettier to format code. You
can run `node script/eslint --fix` to fix linting issues and apply Prettier formatting.
We recommend you to enable running ESLint via your IDE.

Whenever possible we are trying to use Prettier and linting over written style guide rules.
Consider every linting rule and every Prettier rule to be also part of our style guide
and disable them only in exceptional cases and ideally leave a comment why they are
disabled at that specific place.

## HTML

This part contains style guide rules around general (framework agnostic) HTML usage.

### Camel case `id` and `data-test-subj`

Use camel case for the values of attributes such as `id` and `data-test-subj` selectors.

```html
<button id="veryImportantButton" data-test-subj="clickMeButton">
  Click me
</button>
```

The only exception is in cases where you're dynamically creating the value, and you need to use
hyphens as delimiters:

```jsx
buttons.map(btn => (
  <button
    id={`veryImportantButton-${btn.id}`}
    data-test-subj={`clickMeButton-${btn.id}`}
  >
    {btn.label}
  </button>
)
```

### Capitalization in HTML and CSS should always match

It's important that when you write CSS/SASS selectors using classes, IDs, and attributes
(keeping in mind that we should _never_ use IDs and attributes in our selectors), that the
capitalization in the CSS matches that used in the HTML. HTML and CSS follow different case sensitivity rules, and we can avoid subtle gotchas by ensuring we use the
same capitalization in both of them.

### How to generate ids?

When labeling elements (and for some other accessibility tasks) you will often need
ids. Ids must be unique within the page i.e. no duplicate ids in the rendered DOM
at any time.

Since we have some components that are used multiple times on the page, you must
make sure every instance of that component has a unique `id`. To make the generation
of those `id`s easier, you can use the `htmlIdGenerator` service in the `@elastic/eui`.

A React component could use it as follows:

```jsx
import { htmlIdGenerator } from '@elastic/eui';

render() {
  // Create a new generator that will create ids deterministic
  const htmlId = htmlIdGenerator();
  return (<div>
    <label htmlFor={htmlId('agg')}>Aggregation</label>
    <input id={htmlId('agg')}/>
  </div>);
}
```

Each id generator you create by calling `htmlIdGenerator()` will generate unique but
deterministic ids. As you can see in the above example, that single generator
created the same id in the label's `htmlFor` as well as the input's `id`.

A single generator instance will create the same id when passed the same argument
to the function multiple times. But two different generators will produce two different
ids for the same argument to the function, as you can see in the following example:

```js
const generatorOne = htmlIdGenerator();
const generatorTwo = htmlIdGenerator();

// Those statements are always true:
// Same generator
generatorOne('foo') === generatorOne('foo');
generatorOne('foo') !== generatorOne('bar');

// Different generator
generatorOne('foo') !== generatorTwo('foo');
```

This allows multiple instances of a single React component to now have different ids.
If you include the above React component multiple times in the same page,
each component instance will have a unique id, because each render method will use a different
id generator.

You can also use this service outside of React.

## API endpoints

The following style guide rules are targeting development of server side API endpoints.

### Paths

API routes must start with the `/api/` path segment, and should be followed by the plugin id if applicable:

**Right:** `/api/marvel/nodes`

**Wrong:** `/marvel/api/nodes`

### snake_case

Kibana uses `snake_case` for the entire API, just like Elasticsearch. All urls, paths, query string parameters, values, and bodies should be `snake_case` formatted.

_Right:_

```
POST /api/kibana/index_patterns
{
  "id": "...",
  "time_field_name": "...",
  "fields": [
    ...
  ]
}
```

## TypeScript/JavaScript

The following style guide rules apply for working with TypeScript/JavaScript files.

### TypeScript vs. JavaScript

Whenever possible, write code in TypeScript instead of JavaScript, especially if it's new code.
Check out [TYPESCRIPT.md](TYPESCRIPT.md) for help with this process.

### Prefer modern JavaScript/TypeScript syntax

You should prefer modern language features in a lot of cases, e.g.:

- Prefer `class` over `prototype` inheritance
- Prefer arrow function over function expressions
- Prefer arrow function over storing `this` (no `const self = this;`)
- Prefer template strings over string concatenation
- Prefer the spread operator for copying arrays (`[...arr]`) over `arr.slice()`
- Use optional chaining (`?.`) and nullish Coalescing (`??`) over `lodash.get` (and similar utilities)

### Avoid mutability and state

Wherever possible, do not rely on mutable state. This means you should not
reassign variables, modify object properties, or push values to arrays.
Instead, create new variables, and shallow copies of objects and arrays:

```js
// good
function addBar(foos, foo) {
  const newFoo = { ...foo, name: 'bar' };
  return [...foos, newFoo];
}

// bad
function addBar(foos, foo) {
  foo.name = 'bar';
  foos.push(foo);
}
```

### Avoid `any` whenever possible

Since TypeScript 3.0 and the introduction of the
[`unknown` type](https://mariusschulz.com/blog/the-unknown-type-in-typescript) there are rarely any
reasons to use `any` as a type. Nearly all places of former `any` usage can be replace by either a
generic or `unknown` (in cases the type is really not known).

You should always prefer using those mechanisms over using `any`, since they are stricter typed and
less likely to introduce bugs in the future due to insufficient types.

If you’re not having `any` in your plugin or are starting a new plugin, you should enable the
[`@typescript-eslint/no-explicit-any`](https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-explicit-any.md)
linting rule for your plugin via the [`.eslintrc.js`](https://github.com/elastic/kibana/blob/master/.eslintrc.js) config.

### Avoid non-null assertions

You should try avoiding non-null assertions (`!.`) wherever possible. By using them you tell
TypeScript, that something is not null even though by it’s type it could be. Usage of non-null
assertions is most often a side-effect of you actually checked that the variable is not `null`
but TypeScript doesn’t correctly carry on that information till the usage of the variable.

In most cases it’s possible to replace the non-null assertion by structuring your code/checks slightly different
or using [user defined type guards](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards)
to properly tell TypeScript what type a variable has.

Using non-null assertion increases the risk for future bugs. In case the condition under which we assumed that the
variable can’t be null has changed (potentially even due to changes in compeltely different files), the non-null
assertion would now wrongly disable proper type checking for us.

If you’re not using non-null assertions in your plugin or are starting a new plugin, consider enabling the
[`@typescript-eslint/no-non-null-assertion`](https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-non-null-assertion.md)
linting rule for you plugin in the [`.eslintrc.js`](https://github.com/elastic/kibana/blob/master/.eslintrc.js) config.

### Return/throw early from functions

To avoid deep nesting of if-statements, always return a function's value as early
as possible. And where possible, do any assertions first:

```js
// good
function doStuff(val) {
  if (val > 100) {
    throw new Error('Too big');
  }

  if (val < 0) {
    return false;
  }

  // ... stuff
}

// bad
function doStuff(val) {
  if (val >= 0) {
    if (val < 100) {
      // ... stuff
    } else {
      throw new Error('Too big');
    }
  } else {
    return false;
  }
}
```

### Use object destructuring

This helps avoid temporary references and helps prevent typo-related bugs.

```js
// best
function fullName({ first, last }) {
  return `${first} ${last}`;
}

// good
function fullName(user) {
  const { first, last } = user;
  return `${first} ${last}`;
}

// bad
function fullName(user) {
  const first = user.first;
  const last = user.last;
  return `${first} ${last}`;
}
```

### Use array destructuring

Directly accessing array values via index should be avoided, but if it is
necessary, use array destructuring:

```js
const arr = [1, 2, 3];

// good
const [first, second] = arr;

// bad
const first = arr[0];
const second = arr[1];
```

### Magic numbers/strings

These are numbers (or other values) simply used in line in your code. _Do not
use these_, give them a variable name so they can be understood and changed
easily.

```js
// good
const minWidth = 300;

if (width < minWidth) {
  ...
}

// bad
if (width < 300) {
  ...
}
```

### Modules

Module dependencies should be written using native ES2015 syntax wherever
possible (which is almost everywhere):

```js
// good
import { mapValues } from 'lodash';
export mapValues;

// bad
const _ = require('lodash');
module.exports = _.mapValues;

// worse
define(['lodash'], function (_) {
  ...
});
```

In those extremely rare cases where you're writing server-side JavaScript in a
file that does not pass run through webpack, then use CommonJS modules.

In those even rarer cases where you're writing client-side code that does not
run through webpack, then do not use a module loader at all.

#### Import only top-level modules

The files inside a module are implementation details of that module. They
should never be imported directly. Instead, you must only import the top-level
API that's exported by the module itself.

Without a clear mechanism in place in JS to encapsulate protected code, we make
a broad assumption that anything beyond the root of a module is an
implementation detail of that module.

On the other hand, a module should be able to import parent and sibling
modules.

```js
// good
import foo from 'foo';
import child from './child';
import parent from '../';
import ancestor from '../../../';
import sibling from '../foo';

// bad
import inFoo from 'foo/child';
import inSibling from '../foo/child';
```

### Global definitions

Don't do this. Everything should be wrapped in a module that can be depended on
by other modules. Even things as simple as a single value should be a module.

### Only use ternary operators for small, simple code

And _never_ use multiple ternaries together, because they make it more
difficult to reason about how different values flow through the conditions
involved. Instead, structure the logic for maximum readability.

```js
// good, a situation where only 1 ternary is needed
const foo = a === b ? 1 : 2;

// bad
const foo = a === b ? 1 : a === c ? 2 : 3;
```

### Use descriptive conditions

Any non-trivial conditions should be converted to functions or assigned to
descriptively named variables. By breaking up logic into smaller,
self-contained blocks, it becomes easier to reason about the higher-level
logic. Additionally, these blocks become good candidates for extraction into
their own modules, with unit-tests.

```js
// best
function isShape(thing) {
  return thing instanceof Shape;
}
function notSquare(thing) {
  return !(thing instanceof Square);
}
if (isShape(thing) && notSquare(thing)) {
  ...
}

// good
const isShape = thing instanceof Shape;
const notSquare = !(thing instanceof Square);
if (isShape && notSquare) {
  ...
}

// bad
if (thing instanceof Shape && !(thing instanceof Square)) {
  ...
}
```

### Name regular expressions

```js
// good
const validPassword = /^(?=.*\d).{4,}$/;

if (password.length >= 4 && validPassword.test(password)) {
  console.log('password is valid');
}

// bad
if (password.length >= 4 && /^(?=.*\d).{4,}$/.test(password)) {
  console.log('losing');
}
```

### Write small functions

Keep your functions short. A good function fits on a slide that the people in
the last row of a big room can comfortably read. So don't count on them having
perfect vision and limit yourself to ~15 lines of code per function.

### Use "rest" syntax rather than built-in `arguments`

For expressiveness sake, and so you can be mix dynamic and explicit arguments.

```js
// good
function something(foo, ...args) {
  ...
}

// bad
function something(foo) {
  const args = Array.from(arguments).slice(1);
  ...
}
```

### Default argument syntax

Always use the default argument syntax for optional arguments.

```js
// good
function foo(options = {}) {
  ...
}

// bad
function foo(options) {
  if (typeof options === 'undefined') {
    options = {};
  }
  ...
}
```

And put your optional arguments at the end.

```js
// good
function foo(bar, options = {}) {
  ...
}

// bad
function foo(options = {}, bar) {
  ...
}
```

### Use thunks to create closures, where possible

For trivial examples (like the one that follows), thunks will seem like
overkill, but they encourage isolating the implementation details of a closure
from the business logic of the calling code.

```js
// good
function connectHandler(client, callback) {
  return () => client.connect(callback);
}
setTimeout(connectHandler(client, afterConnect), 1000);

// not as good
setTimeout(() => {
  client.connect(afterConnect);
}, 1000);

// bad
setTimeout(() => {
  client.connect(() => {
    ...
  });
}, 1000);
```

### Use slashes for comments

Use slashes for both single line and multi line comments. Try to write
comments that explain higher level mechanisms or clarify difficult
segments of your code. _Don't use comments to restate trivial things_.

_Exception:_ Comment blocks describing a function and its arguments
(docblock) should start with `/**`, contain a single `*` at the beginning of
each line, and end with `*/`.

```js
// good

// 'ID_SOMETHING=VALUE' -> ['ID_SOMETHING=VALUE', 'SOMETHING', 'VALUE']
const matches = item.match(/ID_([^\n]+)=([^\n]+)/));

/**
 * Fetches a user from...
 * @param  {string} id - id of the user
 * @return {Promise}
 */
function loadUser(id) {
  // This function has a nasty side effect where a failure to increment a
  // redis counter used for statistics will cause an exception. This needs
  // to be fixed in a later iteration.

  ...
}

const isSessionValid = (session.expires < Date.now());
if (isSessionValid) {
  ...
}

// bad

// Execute a regex
const matches = item.match(/ID_([^\n]+)=([^\n]+)/));

// Usage: loadUser(5, function() { ... })
function loadUser(id, cb) {
  // ...
}

// Check if the session is valid
const isSessionValid = (session.expires < Date.now());
// If the session is valid
if (isSessionValid) {
  ...
}
```

### Getters and Setters

Feel free to use getters that are free from [side effects][sideeffect], like
providing a length property for a collection class.

Do not use setters, they cause more problems than they can solve.

[sideeffect]: http://en.wikipedia.org/wiki/Side_effect_(computer_science)

## SASS files

When writing a new component, create a sibling SASS file of the same name and import directly into the **top** of the JS/TS component file. Doing so ensures the styles are never separated or lost on import and allows for better modularization (smaller individual plugin asset footprint).

All SASS (.scss) files will automatically build with the [EUI](https://elastic.github.io/eui/#/guidelines/sass) & Kibana invisibles (SASS variables, mixins, functions) from the [`globals_[theme].scss` file](src/legacy/ui/public/styles/_globals_v7light.scss).

While the styles for this component will only be loaded if the component exists on the page,
the styles **will** be global and so it is recommended to use a three letter prefix on your
classes to ensure proper scope.

**Example:**

```tsx
// component.tsx

import './component.scss';
// All other imports below the SASS import

export const Component = () => {
  return (
    <div className="plgComponent" />
  );
}
```

```scss
// component.scss

.plgComponent { ... }
```

Do not use the underscore `_` SASS file naming pattern when importing directly into a javascript file.

## React

The following style guide rules are specific for working with the React framework.

### Prefer reactDirective over react-component

When using `ngReact` to embed your react components inside Angular HTML, prefer the
`reactDirective` service over the `react-component` directive.
You can read more about these two ngReact methods [here](https://github.com/ngReact/ngReact#features).

Using `react-component` means adding a bunch of components into angular, while `reactDirective` keeps them isolated, and is also a more succinct syntax.

**Good:**

```html
<hello-component
  fname="person.fname"
  lname="person.lname"
  watch-depth="reference"
></hello-component>
```

**Bad:**

```html
<react-component name="HelloComponent" props="person" watch-depth="reference" />
```

### Action function names and prop function names

Name action functions in the form of a strong verb and passed properties in the form of on<Subject><Change>. E.g:

```jsx
<sort-button onClick={action.sort}/>
<pagerButton onPageNext={action.turnToNextPage} />
```

## Attribution

Parts of the JavaScript style guide were initially forked from the
[node style guide](https://github.com/felixge/node-style-guide) created by [Felix Geisendörfer](http://felixge.de/) which is
licensed under the [CC BY-SA 3.0](http://creativecommons.org/licenses/by-sa/3.0/)
license.
