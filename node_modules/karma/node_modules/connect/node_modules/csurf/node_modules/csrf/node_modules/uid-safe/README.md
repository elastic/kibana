# uid-safe

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Node.js Version][node-version-image]][node-version-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]

URL and cookie safe UIDs

Create cryptographically secure UIDs safe for both cookie and URL usage.
This is in contrast to modules such as [rand-token](https://www.npmjs.com/package/rand-token)
and [uid2](https://www.npmjs.com/package/uid2) whose UIDs are actually skewed
due to the use of `%` and unnecessarily truncate the UID.
Use this if you could still use UIDs with `-` and `_` in them.

## Installation

```sh
$ npm install uid-safe
```

## API

```js
var uid = require('uid-safe')
```

### uid(byteLength, callback)

Asynchronously create a UID with a specific byte length. Because `base64`
encoding is used underneath, this is not the string length. For example,
to create a UID of length 24, you want a byte length of 18.

```js
uid(18, function (err, string) {
  if (err) throw err
  // do something with the string
})
```

### uid(byteLength)

Asynchronously create a UID with a specific byte length and return a
`Promise`.

**To use promises, you must either install [bluebird](https://www.npmjs.com/package/bluebird)
or use a version of Node.js that has native promises, otherwise an
error will be thrown.**

```js
uid(18).then(function (string) {
  // do something with the string
})
```

### uid.sync(byteLength)

A synchronous version of above.

```js
var string = uid.sync(18)
```

## License

[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/uid-safe.svg?style=flat
[npm-url]: https://npmjs.org/package/uid-safe
[node-version-image]: https://img.shields.io/node/v/uid-safe.svg?style=flat
[node-version-url]: http://nodejs.org/download/
[travis-image]: https://img.shields.io/travis/crypto-utils/uid-safe.svg?style=flat
[travis-url]: https://travis-ci.org/crypto-utils/uid-safe
[coveralls-image]: https://img.shields.io/coveralls/crypto-utils/uid-safe.svg?style=flat
[coveralls-url]: https://coveralls.io/r/crypto-utils/uid-safe?branch=master
[downloads-image]: https://img.shields.io/npm/dm/uid-safe.svg?style=flat
[downloads-url]: https://npmjs.org/package/uid-safe
