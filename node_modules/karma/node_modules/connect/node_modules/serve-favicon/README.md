# serve-favicon

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]
[![Gittip][gittip-image]][gittip-url]

Node.js middleware for serving a favicon.

Why use this module?

  - User agents request `favicon.ico` frequently and indiscriminately, so you
    may wish to exclude these requests from your logs by using this middleware
    before your logger middleware.
  - This module caches the icon in memory to improve performance by skipping
    disk access.
  - This module provides an `ETag` based on the contents of the icon, rather
    than file system properties.
  - This module will serve with the most compatible `Content-Type`.

## Install

```bash
npm install serve-favicon
```

## API

### favicon(path, options)

Create new middleware to serve a favicon from the given `path` to a favicon file.
`path` may also be a `Buffer` of the icon to serve.

#### Options

Serve favicon accepts these properties in the options object.

##### maxAge

The `cache-control` `max-age` directive in `ms`, defaulting to 1 day. This can
also be a string accepted by the [ms](https://www.npmjs.org/package/ms#readme)
module.

## Examples

Typically this middleware will come very early in your stack (maybe even first)
to avoid processing any other middleware if we already know the request is for
`/favicon.ico`.

### express

```javascript
var express = require('express');
var favicon = require('serve-favicon');

var app = express();
app.use(favicon(__dirname + '/public/favicon.ico'));

// Add your routes here, etc.

app.listen(3000);
```

### connect

```javascript
var connect = require('connect');
var favicon = require('serve-favicon');

var app = connect();
app.use(favicon(__dirname + '/public/favicon.ico'));

// Add your middleware here, etc.

app.listen(3000);
```

### vanilla http server

This middleware can be used anywhere, even outside express/connect. It takes
`req`, `res`, and `callback`.

```javascript
var http = require('http');
var favicon = require('serve-favicon');
var finalhandler = require('finalhandler');

var _favicon = favicon(__dirname + '/public/favicon.ico');

var server = http.createServer(function onRequest(req, res) {
  var done = finalhandler(req, res);

  _favicon(req, res, function onNext(err) {
    if (err) return done(err);

    // continue to process the request here, etc.

    res.statusCode = 404;
    res.end('oops');
  });
});

server.listen(3000);
```

## License

[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/serve-favicon.svg?style=flat
[npm-url]: https://npmjs.org/package/serve-favicon
[travis-image]: https://img.shields.io/travis/expressjs/serve-favicon.svg?style=flat
[travis-url]: https://travis-ci.org/expressjs/serve-favicon
[coveralls-image]: https://img.shields.io/coveralls/expressjs/serve-favicon.svg?style=flat
[coveralls-url]: https://coveralls.io/r/expressjs/serve-favicon?branch=master
[downloads-image]: https://img.shields.io/npm/dm/serve-favicon.svg?style=flat
[downloads-url]: https://npmjs.org/package/serve-favicon
[gittip-image]: https://img.shields.io/gittip/dougwilson.svg?style=flat
[gittip-url]: https://www.gittip.com/dougwilson/
