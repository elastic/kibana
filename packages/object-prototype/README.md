# object-prototype

A replacement prototype for `Object.prototype` with all the same
functions.

[![npm](https://img.shields.io/npm/v/object-prototype.svg)](https://www.npmjs.com/package/object-prototype)

## Installation

```
npm install object-prototype --save
```

## Usage

```js
const { create, ObjectPrototype } = require('object-prototype');

const obj1 = create();
const obj2 = {};

console.log(Object.prototype.isPrototypeOf(obj1)); // false
console.log(ObjectPrototype.isPrototypeOf(obj1)); // true

console.log(Object.prototype.isPrototypeOf(obj2)); // true
console.log(ObjectPrototype.isPrototypeOf(obj2)); // false

Object.prototype.foo = 42;

console.log(obj1.foo); // undefined
console.log(obj2.foo); // 42
```

## API

### `ObjectPrototype`

The `ObjectPrototype` property exposed by this module is ment as a
replacement to `Object.prototype` and has the following ECMAScript
spec'd functions:

- [`ObjectPrototype.hasOwnProperty()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty)
- [`ObjectPrototype.isPrototypeOf()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/isPrototypeOf)
- [`ObjectPrototype.propertyIsEnumerable()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/propertyIsEnumerable)
- [`ObjectPrototype.toLocaleString()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toLocaleString)
- [`ObjectPrototype.toString()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString)
- [`ObjectPrototype.valueOf()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/valueOf)

And the following functions which are considered deprecated according to
the ECMAScript specification:

- [`ObjectPrototype.__defineGetter__()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/__defineGetter__)
- [`ObjectPrototype.__defineSetter__()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/__defineSetter__)
- [`ObjectPrototype.__lookupGetter__()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/__lookupGetter__)
- [`ObjectPrototype.__lookupSetter__()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/__lookupSetter__)

### `object = create()`

The `create` function is a convenience function that returns a new
object with `ObjectPrototype` as its prototype.

This is equivalent to writing `Object.create(ObjectPrototype)`.

### `object = assign([...objects])`

The `assign` function is a convenience function that returns a new
object with all the same properties as the provided objects, but with
`ObjectPrototype` as its prototype.

This is equivalent to writing
`Object.assign(Object.create(ObjectPrototype), ...objects)`.

### `FunctionPrototype`

The `FunctionPrototype` property exposed by this module is ment as a
replacement to `Function.prototype` and exposes the same properties.

### `function = safePrototypeFunction(function)`

Given a function as the first argument, `safePrototypeFunction` will
return another function which wraps the given function in a way so that
it doesn't leak `Object.prototype`.
