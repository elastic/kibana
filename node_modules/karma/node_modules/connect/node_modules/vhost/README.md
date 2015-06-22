# vhost

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]
[![Gratipay][gratipay-image]][gratipay-url]

## Install

```sh
$ npm install vhost
```

## API

```js
var vhost = require('vhost')
```

### vhost(hostname, server)

Create a new middleware function to hand off request to `server` when the incoming
host for the request matches `hostname`.

`hostname` can be a string or a RegExp object. When `hostname` is a string it can
contain `*` to match 1 or more characters in that section of the hostname. When
`hostname` is a RegExp, it will be forced to case-insensitive (since hostnames are)
and will be forced to match based on the start and end of the hostname.

When host is matched and the request is sent down to a vhost handler, the `req.vhost`
property will be populated with an object. This object will have numeric properties
corresponding to each wildcard (or capture group if RegExp object provided) and the
`hostname` that was matched.

```js
// for match of "foo.bar.example.com:8080" against "*.*.example.com":
req.vhost.host === 'foo.bar.example.com:8080'
req.vhost.hostname === 'foo.bar.example.com'
req.vhost.length === 2
req.vhost[0] === 'foo'
req.vhost[1] === 'bar'
```

## Examples

### using with connect for static serving

```js
var connect = require('connect')
var serveStatic = require('serve-static')
var vhost = require('vhost')

var mailapp = connect()

// add middlewares to mailapp for mail.example.com

// create app to serve static files on subdomain
var staticapp = connect()
staticapp.use(serveStatic('public'))

// create main app
var app = connect()

// add vhost routing to main app for mail
app.use(vhost('mail.example.com', mailapp))

// route static assets for "assets-*" subdomain to get
// around max host connections limit on browsers
app.use(vhost('assets-*.example.com', staticapp))

// add middlewares and main usage to app

app.listen(3000)
```

### using with connect for user subdomains

```js
var connect = require('connect')
var serveStatic = require('serve-static')
var vhost = require('vhost')

var mainapp = connect()

// add middlewares to mainapp for the main web site

// create app that will server user content from public/{username}/
var userapp = connect()

userapp.use(function(req, res, next){
  var username = req.vhost[0] // username is the "*"

  // pretend request was for /{username}/* for file serving
  req.originalUrl = req.url
  req.url = '/' + username + req.url

  next()
})
userapp.use(serveStatic('public'))

// create main app
var app = connect()

// add vhost routing for main app
app.use(vhost('userpages.local', mainapp))
app.use(vhost('www.userpages.local', mainapp))

// listen on all subdomains for user pages
app.use(vhost('*.userpages.local', userapp))

app.listen(3000)
```

## License

[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/vhost.svg?style=flat
[npm-url]: https://npmjs.org/package/vhost
[travis-image]: https://img.shields.io/travis/expressjs/vhost.svg?style=flat
[travis-url]: https://travis-ci.org/expressjs/vhost
[coveralls-image]: https://img.shields.io/coveralls/expressjs/vhost.svg?style=flat
[coveralls-url]: https://coveralls.io/r/expressjs/vhost
[downloads-image]: https://img.shields.io/npm/dm/vhost.svg?style=flat
[downloads-url]: https://npmjs.org/package/vhost
[gratipay-image]: https://img.shields.io/gratipay/dougwilson.svg?style=flat
[gratipay-url]: https://gratipay.com/dougwilson/
