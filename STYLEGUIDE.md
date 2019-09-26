# Kibana Style Guide

This guide applies to all development within the Kibana project and is
recommended for the development of all Kibana plugins.

Besides the content in this style guide, the following style guides may also apply
to all development within the Kibana project. Please make sure to also read them:

- [Accessibility style guide](style_guides/accessibility_guide.md)
- [SASS style guide](https://elastic.github.io/eui/#/guidelines/sass)

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
<button
  id="veryImportantButton"
  data-test-subj="clickMeButton"
>
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

## API endpoints

The following style guide rules are targeting development of server side API endpoints.

### Paths

API routes must start with the `/api/` path segment, and should be followed by the plugin id if applicable:

**Right:** `/api/marvel/nodes`

**Wrong:** `/marvel/api/nodes`

### snake_case

Kibana uses `snake_case` for the entire API, just like Elasticsearch. All urls, paths, query string parameters, values, and bodies should be `snake_case` formatted.

*Right:*
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

* Prefer `class` over `prototype` inheritance
* Prefer arrow function over function expressions
* Prefer arrow function over storing `this` (no `const self = this;`)
* Prefer template strings over string concatenation
* Prefer the spread operator for copying arrays (`[...arr]`) over `arr.slice()`

### Avoid mutability and state

Wherever possible, do not rely on mutable state. This means you should not
reassign variables, modify object properties, or push values to arrays.
Instead, create new variables, and shallow copies of objects and arrays:

```js
// good
function addBar(foos, foo) {
  const newFoo = {...foo, name: 'bar'};
  return [...foos, newFoo];
}

// bad
function addBar(foos, foo) {
  foo.name = 'bar';
  foos.push(foo);
}
```

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

These are numbers (or other values) simply used in line in your code. *Do not
use these*, give them a variable name so they can be understood and changed
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

And *never* use multiple ternaries together, because they make it more
difficult to reason about how different values flow through the conditions
involved. Instead, structure the logic for maximum readability.

```js
// good, a situation where only 1 ternary is needed
const foo = (a === b) ? 1 : 2;

// bad
const foo = (a === b) ? 1 : (a === c) ? 2 : 3;
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
segments of your code. *Don't use comments to restate trivial things*.

*Exception:* Comment blocks describing a function and its arguments
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

## React

The following style guide rules are specific for working with the React framework.

### Prefer reactDirective over react-component

When using `ngReact` to embed your react components inside Angular HTML, prefer the
`reactDirective` service over the `react-component` directive.
You can read more about these two ngReact methods [here](https://github.com/ngReact/ngReact#features).

Using `react-component` means adding a bunch of components into angular, while `reactDirective` keeps them isolated, and is also a more succinct syntax.

**Good:**
```html
<hello-component fname="person.fname" lname="person.lname" watch-depth="reference"></hello-component>
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
