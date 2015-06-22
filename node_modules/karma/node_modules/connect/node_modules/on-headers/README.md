# on-headers

[![NPM Version](https://img.shields.io/npm/v/on-headers.svg?style=flat)](https://www.npmjs.org/package/on-headers)
[![Node.js Version](https://img.shields.io/badge/node.js->=_0.8-blue.svg?style=flat)](http://nodejs.org/download/)
[![Build Status](https://img.shields.io/travis/jshttp/on-headers.svg?style=flat)](https://travis-ci.org/jshttp/on-headers)
[![Coverage Status](https://img.shields.io/coveralls/jshttp/on-headers.svg?style=flat)](https://coveralls.io/r/jshttp/on-headers)
[![Gittip](https://img.shields.io/gittip/dougwilson.svg?style=flat)](https://www.gittip.com/dougwilson/)

Execute a listener when a response is about to write headers.

## Install

```sh
$ npm install on-headers
```

## API

```js
var onHeaders = require('on-headers')
```

### onHeaders(res, listener)

This will add the listener `listener` to fire when headers are emitted for `res`.
The listener is passed the `response` object as it's context (`this`). Headers are
considered to be emitted only once, right before they are sent to the client.

When this is called multiple times on the same `res`, the `listener`s are fired
in the reverse order they were added.

## Examples

```js
var http = require('http')
var onHeaders = require('on-headers')

http
.createServer(onRequest)
.listen(3000)

function addPoweredBy() {
  // add if not set by end of request
  if (!this.getHeader('X-Powered-By')) {
    this.addHeader('X-Powered-By', 'Node.js')
  }
}

function onRequest(req, res) {
  onHeaders(res, addPoweredBy)

  res.setHeader('Content-Type', 'text/plain')
  res.end('hello!')
}
```

## License

[MIT](LICENSE)
