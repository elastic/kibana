# @elastic/safer-lodash-set

This module adds protection against prototype pollution to the [`set`]
and [`setWith`] functions from [Lodash] and are API compatible with
Lodash v4.x.

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

### Functional Programming support (fp)

This module also supports the `lodash/fp` api and hence exposes the
following fp compatible functions:

```js
const { set, setWith } = require('@elastic/safer-lodash-set/fp');
```

Besides the main fp module, it's also possible to require each function
individually:

```js
const set = require('@elastic/safer-lodash-set/fp/set');
const setWith = require('@elastic/safer-lodash-set/fp/setWith');
```

## Limitations

The safety improvements in this module is achieved by adding the
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
  fn1: function () {},
  fn2: () => {},
};

// Attempting to access any function prototype will result in an
// exception being thrown:
assert.throws(() => {
  // Throws: Illegal access of function prototype
  set(object, 'fn1.prototype.toString', 'bang!');
});

// This also goes for arrow functions even though they don't have a
// prototype property. This is just to keep things consistent:
assert.throws(() => {
  // Throws: Illegal access of function prototype
  set(object, 'fn2.prototype.toString', 'bang!');
});
```

## License

[MIT](LICENSE)

[`set`]: https://lodash.com/docs/4.17.15#set
[`setwith`]: https://lodash.com/docs/4.17.15#setWith
[lodash]: https://lodash.com/
