# errorhandler

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]
[![Gratipay][gratipay-image]][gratipay-url]

Development-only error handler middleware

## Install

```sh
$ npm install errorhandler
```

## API

```js
var errorhandler = require('errorhandler')
```

### errorhandler()

Create new middleware to handle errors and respond with content negotiation.
This middleware is only intended to be used in a development environment, as
the full error stack traces will be sent back to the client when an error
occurs.

## Example

```js
var connect = require('connect')
var errorhandler = require('errorhandler')

var app = connect()

if (process.env.NODE_ENV === 'development') {
  // only use in development
  app.use(errorhandler())
}
```

## License

[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/errorhandler.svg?style=flat
[npm-url]: https://npmjs.org/package/errorhandler
[travis-image]: https://img.shields.io/travis/expressjs/errorhandler.svg?style=flat
[travis-url]: https://travis-ci.org/expressjs/errorhandler
[coveralls-image]: https://img.shields.io/coveralls/expressjs/errorhandler.svg?style=flat
[coveralls-url]: https://coveralls.io/r/expressjs/errorhandler?branch=master
[downloads-image]: http://img.shields.io/npm/dm/errorhandler.svg?style=flat
[downloads-url]: https://npmjs.org/package/errorhandler
[gratipay-image]: https://img.shields.io/gratipay/dougwilson.svg?style=flat
[gratipay-url]: https://www.gratipay.com/dougwilson/
