# object-prototype-functions

An array containing the names of the functions on `Object.prototype`.

[![npm](https://img.shields.io/npm/v/object-prototype-functions.svg)](https://www.npmjs.com/package/object-prototype-functions)

## Installation

```
npm install object-prototype-functions --save
```

## Usage

```js
const ObjectPrototypeFunctions = require('object-prototype-functions')

console.log('The functions of Object.prototype are:')
console.log(ObjectPrototypeFunctions.join(', ')) // hasOwnProperty, isPrototypeOf...
```

## API

### `ObjectPrototypeFunctions`

An array containing the names of the functions on `Object.prototype`.

### `ObjectPrototypeFunctions.deprecated`

An array containing the names of the deprecated functions on
`Object.prototype`.

### `ObjectPrototypeFunctions.nonSpec`

An array containing the names of the non-spec'd functions on
`Object.prototype`.

### `ObjectPrototypeFunctions.nodejs`

An array containing the all names of the functions on `Object.prototype`
that are normally available in Node.js - both the spec'd and deprecated
functions.

### `ObjectPrototypeFunctions.all`

An array containing the all names of the functions on
`Object.prototype`, both the spec'd, deprecated, and non-spec'd
functions.
