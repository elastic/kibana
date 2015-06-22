# connect-timeout

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]
[![Gratipay][gratipay-image]][gratipay-url]

Times out the request in `ms`, defaulting to `5000`.

## Install

```sh
$ npm install connect-timeout
```

## API

**NOTE** This module is not recommend as a "top-level" middleware (i.e. `app.use(timeout('5s'))`) unless
you take precautions to halt your own middleware processing. See [as top-level middleware](#as-top-level-middleware)
for how to use as a top-level middleware.

### timeout(time, options)

Returns middleware that times out in `time` milliseconds. `time` can also be a string accepted by the [ms](https://www.npmjs.org/package/ms#readme) module. On timeout, `req` will emit `"timeout"`.

#### options

* `respond` - If `true`, the timeout error is passed to `next()` so that you may customize the response behavior. This error has a `.timeout` property as well as `.status == 503`. This defaults to `true`.

### req.clearTimeout()

Clears the timeout on the request.

### req.timedout

`true` if timeout fired; `false` otherwise.

## Examples

### as top-level middleware

Because of the way middleware processing works, this once this module passes the request
to the next middleware (which it has to do in order for you to do work), it can no longer
stop the flow, so you must take care to check if the request has timedout before you
continue to act on the request.

```javascript
var express = require('express');
var timeout = require('connect-timeout');

// example of using this top-level; note the use of haltOnTimedout
// after every middleware; it will stop the request flow on a timeout
var app = express();
app.use(timeout('5s'));
app.use(bodyParser());
app.use(haltOnTimedout);
app.use(cookieParser());
app.use(haltOnTimedout);

// Add your routes here, etc.

function haltOnTimedout(req, res, next){
  if (!req.timedout) next();
}

app.listen(3000);
```

### express 3.x

```javascript
var express = require('express');
var bodyParser = require('body-parser');
var timeout = require('connect-timeout');

var app = express();
app.post('/save', timeout('5s'), bodyParser.json(), haltOnTimedout, function(req, res, next){
  savePost(req.body, function(err, id){
    if (err) return next(err);
    if (req.timedout) return;
    res.send('saved as id ' + id);
  });
});

function haltOnTimedout(req, res, next){
  if (!req.timedout) next();
}

function savePost(post, cb){
  setTimeout(function(){
    cb(null, ((Math.random()* 40000) >>> 0));
  }, (Math.random()* 7000) >>> 0));
}

app.listen(3000);
```

### connect

```javascript
var bodyParser = require('body-parser');
var connect = require('connect');
var timeout = require('connect-timeout');

var app = require('connect');
app.use('/save', timeout('5s'), bodyParser.json(), haltOnTimedout, function(req, res, next){
  savePost(req.body, function(err, id){
    if (err) return next(err);
    if (req.timedout) return;
    res.send('saved as id ' + id);
  });
});

function haltOnTimedout(req, res, next){
  if (!req.timedout) next();
}

function savePost(post, cb){
  setTimeout(function(){
    cb(null, ((Math.random()* 40000) >>> 0));
  }, (Math.random()* 7000) >>> 0));
}

app.listen(3000);
```

## License

[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/connect-timeout.svg?style=flat
[npm-url]: https://npmjs.org/package/connect-timeout
[travis-image]: https://img.shields.io/travis/expressjs/timeout.svg?style=flat
[travis-url]: https://travis-ci.org/expressjs/timeout
[coveralls-image]: https://img.shields.io/coveralls/expressjs/timeout.svg?style=flat
[coveralls-url]: https://coveralls.io/r/expressjs/timeout?branch=master
[downloads-image]: https://img.shields.io/npm/dm/connect-timeout.svg?style=flat
[downloads-url]: https://npmjs.org/package/connect-timeout
[gratipay-image]: https://img.shields.io/gratipay/dougwilson.svg?style=flat
[gratipay-url]: https://www.gratipay.com/dougwilson/
