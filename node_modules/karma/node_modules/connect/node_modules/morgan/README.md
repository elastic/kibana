# morgan

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]
[![Gratipay][gratipay-image]][gratipay-url]

HTTP request logger middleware for node.js

> Named after [Dexter](http://en.wikipedia.org/wiki/Dexter_Morgan), a show you should not watch until completion.

## API

```js
var morgan = require('morgan')
```

### morgan(format, options)

Create a new morgan logger middleware function using the given `format` and `options`.
The `format` argument may be a string of a predefined name (see below for the names),
a string of a format string, or a function that will produce a log entry.

#### Options

Morgan accepts these properties in the options object.

#### buffer

Buffer duration before writing logs to the `stream`, defaults to `false`. When
set to `true`, defaults to `1000 ms`.

#### immediate

Write log line on request instead of response. This means that a requests will
be logged even if the server crashes, _but data from the response (like the
response code, content length, etc.) cannot be logged_.

##### skip

Function to determine if logging is skipped, defaults to `false`. This function
will be called as `skip(req, res)`.

```js
// EXAMPLE: only log error responses
morgan('combined', {
  skip: function (req, res) { return res.statusCode < 400 }
})
```

##### stream

Output stream for writing log lines, defaults to `process.stdout`.

#### Predefined Formats

There are various pre-defined formats provided:

##### combined

Standard Apache combined log output.

```
:remote-addr - :remote-user [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"
```

##### common

Standard Apache common log output.

```
:remote-addr - :remote-user [:date] ":method :url HTTP/:http-version" :status :res[content-length]
```

##### dev

Concise output colored by response status for development use. The `:status`
token will be colored red for server error codes, yellow for client error
codes, cyan for redirection codes, and uncolored for all other codes.

```
:method :url :status :response-time ms - :res[content-length]
```

##### short

Shorter than default, also including response time.

```
:remote-addr :remote-user :method :url HTTP/:http-version :status :res[content-length] - :response-time ms
```

##### tiny

The minimal output.

```
:method :url :status :res[content-length] - :response-time ms
```

#### Tokens

- `:req[header]` ex: `:req[Accept]`
- `:res[header]` ex: `:res[Content-Length]`
- `:http-version`
- `:response-time`
- `:remote-addr`
- `:remote-user`
- `:date`
- `:method`
- `:url`
- `:referrer`
- `:user-agent`
- `:status`

To define a token, simply invoke `morgan.token()` with the name and a callback function. The value returned is then available as ":type" in this case:
```js
morgan.token('type', function(req, res){ return req.headers['content-type']; })
```

## Examples

### express/connect

Simple app that will log all request in the Apache combined format to STDOUT

```js
var express = require('express')
var morgan = require('morgan')

var app = express()

app.use(morgan('combined'))

app.get('/', function (req, res) {
  res.send('hello, world!')
})
```

### vanilla http server

Simple app that will log all request in the Apache combined format to STDOUT

```js
var finalhandler = require('finalhandler')
var http = require('http')
var morgan = require('morgan')

// create "middleware"
var logger = morgan('combined')

http.createServer(function (req, res) {
  var done = finalhandler(req, res)
  logger(req, res, function (err) {
    if (err) return done(err)

    // respond to request
    res.setHeader('content-type', 'text/plain')
    res.end('hello, world!')
  })
})
```

### write logs to a file

Simple app that will log all request in the Apache combined format to the file "access.log"

```js
var express = require('express')
var fs = require('fs')
var morgan = require('morgan')

var app = express()

// create a write stream (in append mode)
var accessLogStream = fs.createWriteStream(__dirname + '/access.log', {flags: 'a'})

// setup the logger
app.use(morgan('combined', {stream: accessLogStream}))

app.get('/', function (req, res) {
  res.send('hello, world!')
})
```

## License

[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/morgan.svg?style=flat
[npm-url]: https://npmjs.org/package/morgan
[travis-image]: https://img.shields.io/travis/expressjs/morgan.svg?style=flat
[travis-url]: https://travis-ci.org/expressjs/morgan
[coveralls-image]: https://img.shields.io/coveralls/expressjs/morgan.svg?style=flat
[coveralls-url]: https://coveralls.io/r/expressjs/morgan?branch=master
[downloads-image]: http://img.shields.io/npm/dm/morgan.svg?style=flat
[downloads-url]: https://npmjs.org/package/morgan
[gratipay-image]: https://img.shields.io/gratipay/dougwilson.svg?style=flat
[gratipay-url]: https://www.gratipay.com/dougwilson/
