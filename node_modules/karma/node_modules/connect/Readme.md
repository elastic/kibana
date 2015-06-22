# Connect

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]
[![Gittip][gittip-image]][gittip-url]

  Connect is an extensible HTTP server framework for [node](http://nodejs.org), providing high performance "plugins" known as _middleware_.

 Connect is bundled with over _20_ commonly used middleware, including
 a logger, session support, cookie parser, and [more](http://senchalabs.github.com/connect). Be sure to view the 2.x [documentation](http://www.senchalabs.org/connect/).

```js
var connect = require('connect')
  , http = require('http');

var app = connect()
  .use(connect.favicon('public/favicon.ico'))
  .use(connect.logger('dev'))
  .use(connect.static('public'))
  .use(connect.directory('public'))
  .use(connect.cookieParser())
  .use(connect.session({ secret: 'my secret here' }))
  .use(function(req, res){
    res.end('Hello from Connect!\n');
  });

http.createServer(app).listen(3000);
```

## Middleware

  - [basicAuth](http://www.senchalabs.org/connect/basicAuth.html)
  - [bodyParser](http://www.senchalabs.org/connect/bodyParser.html)
  - [compress](http://www.senchalabs.org/connect/compress.html)
  - [cookieParser](http://www.senchalabs.org/connect/cookieParser.html)
  - [cookieSession](http://www.senchalabs.org/connect/cookieSession.html)
  - [csrf](http://www.senchalabs.org/connect/csrf.html)
  - [directory](http://www.senchalabs.org/connect/directory.html)
  - [errorHandler](http://www.senchalabs.org/connect/errorHandler.html)
  - [favicon](http://www.senchalabs.org/connect/favicon.html)
  - [json](http://www.senchalabs.org/connect/json.html)
  - [limit](http://www.senchalabs.org/connect/limit.html) - deprecated, do not use
  - [logger](http://www.senchalabs.org/connect/logger.html)
  - [methodOverride](http://www.senchalabs.org/connect/methodOverride.html) - deprecated, use [method-override](https://www.npmjs.org/package/method-override) instead
  - [multipart](http://www.senchalabs.org/connect/multipart.html) - deprecated, use [connect-multiparty](https://www.npmjs.org/package/connect-multiparty) instead
  - [urlencoded](http://www.senchalabs.org/connect/urlencoded.html)
  - [query](http://www.senchalabs.org/connect/query.html)
  - [responseTime](http://www.senchalabs.org/connect/responseTime.html)
  - [session](http://www.senchalabs.org/connect/session.html)
  - [static](http://www.senchalabs.org/connect/static.html)
  - [staticCache](http://www.senchalabs.org/connect/staticCache.html) - deprecated, do not use
  - [subdomains](http://www.senchalabs.org/connect/subdomains.html)
  - [vhost](http://www.senchalabs.org/connect/vhost.html)

## Running Tests

first:

    $ npm install -d

then:

    $ npm test

## Contributors

 https://github.com/senchalabs/connect/graphs/contributors

## Node Compatibility

  Connect `< 1.x` is compatible with node 0.2.x


  Connect `1.x` is compatible with node 0.4.x


  Connect `2.x` is compatible with node 0.8.x


  Connect `3.x` is compatible with node 0.10.x

## License

[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/connect.svg?style=flat
[npm-url]: https://npmjs.org/package/connect
[travis-image]: https://img.shields.io/travis/senchalabs/connect.svg?style=flat
[travis-url]: https://travis-ci.org/senchalabs/connect
[coveralls-image]: https://img.shields.io/coveralls/senchalabs/connect.svg?style=flat
[coveralls-url]: https://coveralls.io/r/senchalabs/connect
[downloads-image]: https://img.shields.io/npm/dm/connect.svg?style=flat
[downloads-url]: https://npmjs.org/package/connect
[gittip-image]: https://img.shields.io/gittip/dougwilson.svg?style=flat
[gittip-url]: https://www.gittip.com/dougwilson/
