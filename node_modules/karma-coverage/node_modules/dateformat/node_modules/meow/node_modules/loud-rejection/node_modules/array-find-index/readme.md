# array-find-index [![Build Status](https://travis-ci.org/sindresorhus/array-find-index.svg?branch=master)](https://travis-ci.org/sindresorhus/array-find-index)

> ES2015 [`Array#findIndex()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex) ponyfill

> Ponyfill: A polyfill that doesn't overwrite the native method


## Install

```
$ npm install --save array-find-index
```


## Usage

```js
arrayFindIndex = require('array-find-index');

arrayFindIndex(['rainbow', 'unicorn', 'pony'], x => x === 'unicorn');
//=> 1
```


## API

Same as `Array#findIndex()`, but with the input array as the first argument.


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
