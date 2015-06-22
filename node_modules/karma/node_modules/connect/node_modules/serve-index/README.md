# serve-index

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]
[![Gittip][gittip-image]][gittip-url]

  Serves pages that contain directory listings for a given path.

## Install

```sh
$ npm install serve-index
```

## API

```js
var serveIndex = require('serve-index')
```

### serveIndex(path, options)

Returns middlware that serves an index of the directory in the given `path`.

The `path` is based off the `req.url` value, so a `req.url` of `'/some/dir`
with a `path` of `'public'` will look at `'public/some/dir'`. If you are using
something like `express`, you can change the URL "base" with `app.use` (see
the express example).

#### Options

Serve index accepts these properties in the options object.

##### filter

Apply this filter function to files. Defaults to `false`.

##### hidden

Display hidden (dot) files. Defaults to `false`.

##### icons

Display icons. Defaults to `false`.

##### stylesheet

Optional path to a CSS stylesheet. Defaults to a built-in stylesheet.

##### template

Optional path to an HTML template. Defaults to a built-in template.

The following tokens are replaced in templates:

  * `{directory}` with the name of the directory.
  * `{files}` with the HTML of an unordered list of file links.
  * `{linked-path}` with the HTML of a link to the directory.
  * `{style}` with the specified stylesheet and embedded images.

##### view

Display mode. `tiles` and `details` are available. Defaults to `tiles`.

## Examples

### Serve directory indexes with vanilla node.js http server

```js
var finalhandler = require('finalhandler')
var http = require('http')
var serveIndex = require('serve-index')
var serveStatic = require('serve-static')

// Serve directory indexes for public/ftp folder (with icons)
var index = serveIndex('public/ftp', {'icons': true})

// Serve up public/ftp folder files
var serve = serveStatic('public/ftp')

// Create server
var server = http.createServer(function onRequest(req, res){
  var done = finalhandler(req, res)
  serve(req, res, function onNext(err) {
    if (err) return done(err)
    index(req, res, done)
  })
})

// Listen
server.listen(3000)
```

### Serve directory indexes with express

```js
var express    = require('express')
var serveIndex = require('serve-index')

var app = express()

// Serve URLs like /ftp/thing as public/ftp/thing
app.use('/ftp', serveIndex('public/ftp', {'icons': true}))
app.listen()
```

## License

[MIT](LICENSE). The [Silk](http://www.famfamfam.com/lab/icons/silk/) icons
are created by/copyright of [FAMFAMFAM](http://www.famfamfam.com/).

[npm-image]: https://img.shields.io/npm/v/serve-index.svg?style=flat
[npm-url]: https://npmjs.org/package/serve-index
[travis-image]: https://img.shields.io/travis/expressjs/serve-index.svg?style=flat
[travis-url]: https://travis-ci.org/expressjs/serve-index
[coveralls-image]: https://img.shields.io/coveralls/expressjs/serve-index.svg?style=flat
[coveralls-url]: https://coveralls.io/r/expressjs/serve-index?branch=master
[downloads-image]: http://img.shields.io/npm/dm/serve-index.svg?style=flat
[downloads-url]: https://npmjs.org/package/serve-index
[gittip-image]: https://img.shields.io/gittip/dougwilson.svg?style=flat
[gittip-url]: https://www.gittip.com/dougwilson/
