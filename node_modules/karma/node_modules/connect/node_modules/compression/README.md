# compression

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]
[![Gratipay][gratipay-image]][gratipay-url]

Node.js compression middleware.

## Install

```bash
$ npm install compression
```

## API

```js
var compression = require('compression')
```

### compression(options)

Returns the compression middleware using the given `options`.

```js
app.use(compression({
  threshold: 512
}))
```

#### Options

- `threshold` `<1kb>` - response is only compressed if the byte size is at or above this threshold.
- `filter` - a filtering callback function. Uses [Compressible](https://github.com/expressjs/compressible) by default.

In addition to these, [zlib](http://nodejs.org/api/zlib.html) options may be passed in to the options object.

### res.flush

This module adds a `res.flush()` method to force the partially-compressed
response to be flushed to the client.

## Examples

### express/connect

When using this module with express or connect, simply `app.use` the module as
high as you like. Requests that pass through the middleware will be compressed.

```js
var compression = require('compression')
var express = require('express')

var app = express()

// compress all requests
app.use(compression())

// add alll routes
```

### Server-Sent Events

Because of the nature of compression this module does not work out of the box
with server-sent events. To compress content, a window of the output needs to
be buffered up in order to get good compression. Typically when using server-sent
events, there are certain block of data that need to reach the client.

You can achieve this by calling `res.flush()` when you need the data written to
actually make it to the client.

```js
var compression = require('compression')
var express     = require('express')

var app = express()

// compress responses
app.use(compression())

// server-sent event stream
app.get('/events', function (req, res) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')

  // send a ping approx eveny 2 seconds
  var timer = setInterval(function () {
    res.write('data: ping\n\n')

    // !!! this is the important part
    res.flush()
  }, 2000)

  res.on('close', function () {
    clearInterval(timer)
  })
})
```

## License

[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/compression.svg?style=flat
[npm-url]: https://npmjs.org/package/compression
[travis-image]: https://img.shields.io/travis/expressjs/compression.svg?style=flat
[travis-url]: https://travis-ci.org/expressjs/compression
[coveralls-image]: https://img.shields.io/coveralls/expressjs/compression.svg?style=flat
[coveralls-url]: https://coveralls.io/r/expressjs/compression?branch=master
[downloads-image]: https://img.shields.io/npm/dm/compression.svg?style=flat
[downloads-url]: https://npmjs.org/package/compression
[gratipay-image]: https://img.shields.io/gratipay/dougwilson.svg?style=flat
[gratipay-url]: https://www.gratipay.com/dougwilson/
