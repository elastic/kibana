# @elastic/safer-lodash-set

This module adds protection against prototype pollution to the [`set`]
and [`setWith`] functions from [Lodash] and are API compatible with
Lodash v4.x.

[![npm](https://img.shields.io/npm/v/@elastic/safer-lodash-set.svg)](https://www.npmjs.com/package/@elastic/safer-lodash-set)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)

## Installation

```
npm install @elastic/safer-lodash-set --save
```

## Example Usage

```js
const { set } = require('@elastic/safer-loadsh-set');

const object = { a: [{ b: { c: 3 } }] };

set(object, 'a[0].b.c', 4);
console.log(object.a[0].b.c); // => 4

set(object, ['x', '0', 'y', 'z'], 5);
console.log(object.x[0].y.z); // => 5
```

## API

The main module exposes two functions, `set` and `setWith`:

```js
const { set, setWith } = require('@elastic/safer-lodash-set');
```

Besides the main module, it's also possible to require each function
individually:

```js
const set = require('@elastic/safer-lodash-set/set');
const setWith = require('@elastic/safer-lodash-set/setWith');
```

The APIs of these functions are identical to the equivalent Lodash
[`set`] and [`setWith`] functions. Please refer to the Lodash
documentation for the respective functions for details.

## Limitations

The safety improvements in this module is achived by adding the
following limitations to the algorithm used to walk the `path` given as
the 2nd argument to the `set` and `setWith` functions:

### Only own properties are followed when walking the `path`

```js
const parent = { foo: 1 };
const child = { bar: 2 };

Object.setPrototypeOf(child, parent);

// Now `child` can access `foo` through prototype inheritance
console.log(child.foo); // 1

set(child, 'foo', 3);

// A different `foo` property has now been added directly to the `child`
// object and the `parent` object has not been modified:
console.log(child.foo); // 3
console.log(parent.foo); // 1
console.log(Object.prototype.hasOwnProperty.call(child, 'foo')); // true
```

### The `path` must not access function prototypes

```js
const object = {
  fn1: function () {}, // regular functions has a prototype
  fn2: () => {}, // arrow functions doesn't have a prototype
};

// Attempting to access any function prototype will result in an
// exception being thrown:
assert.throws(() => {
  // Throws: Illegal access of function prototype
  set(object, 'fn1.prototype.toString', 'bang!');
});

assert.doesNotThrow(() => {
  // Will just create a fresh `prototype` property on the arrow function:
  set(object, 'fn2.prototype.toString', 'bang!');
  console.log(object.fn2); // '[Function: fn2] { prototype: { toString: 'bang!' } }'
});
```

## License

[MIT](LICENSE)

[`set`]: https://lodash.com/docs/4.17.15#set
[`setwith`]: https://lodash.com/docs/4.17.15#setWith
[lodash]: https://lodash.com/
