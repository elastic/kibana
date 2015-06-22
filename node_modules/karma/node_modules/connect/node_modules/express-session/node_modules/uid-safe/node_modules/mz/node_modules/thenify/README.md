
# thenify

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Dependency Status][david-image]][david-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]
[![Gittip][gittip-image]][gittip-url]

Promisify a callback-based function.

- Preserves function names
- Uses a native promise implementation if available and tries to fall back to `bluebird`
- Converts multiple arguments from the callback into an `Array`
- Resulting function never deoptimizes
- Supports both callback and promise style

An added benefit is that `throw`n errors in that async function will be caught by the promise!

## API

- Turn async functions into promises

```js
var thenify = require('thenify');

var somethingAsync = thenify(function somethingAsync(a, b, c, callback) {
  callback(null, a, b, c);
});
```

- Backward compatible with callback

```js
var thenify = require('thenify').withcallback;

var somethingAsync = thenify(function somethingAsync(a, b, c, callback) {
  callback(null, a, b, c);
});

// somethingAsync(a, b, c).then(onFulfilled).catch(onRejected);
// somethingAsync(a, b, c, function () {});
```

### var fn = thenify(fn)

Promisifies a function.

[gitter-image]: https://badges.gitter.im/thenables/thenify.png
[gitter-url]: https://gitter.im/thenables/thenify
[npm-image]: https://img.shields.io/npm/v/thenify.svg?style=flat-square
[npm-url]: https://npmjs.org/package/thenify
[github-tag]: http://img.shields.io/github/tag/thenables/thenify.svg?style=flat-square
[github-url]: https://github.com/thenables/thenify/tags
[travis-image]: https://img.shields.io/travis/thenables/thenify.svg?style=flat-square
[travis-url]: https://travis-ci.org/thenables/thenify
[coveralls-image]: https://img.shields.io/coveralls/thenables/thenify.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/thenables/thenify
[david-image]: http://img.shields.io/david/thenables/thenify.svg?style=flat-square
[david-url]: https://david-dm.org/thenables/thenify
[license-image]: http://img.shields.io/npm/l/thenify.svg?style=flat-square
[license-url]: LICENSE
[downloads-image]: http://img.shields.io/npm/dm/thenify.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/thenify
[gittip-image]: https://img.shields.io/gratipay/jonathanong.svg?style=flat-square
[gittip-url]: https://gratipay.com/jonathanong/
