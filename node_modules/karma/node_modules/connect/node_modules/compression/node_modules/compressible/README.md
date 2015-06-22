# compressible

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Node.js Version][node-version-image]][node-version-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]

Compressible `Content-Type` / `mime` checking.

### Installation

```bash
$ npm install compressible
```

## API

### compressible(type)

Checks if the given content-type is compressible.

```js
var compressible = require('compressible')

compressible('text/html') // => true
compressible('image/png') // => false
```

## [MIT Licensed](LICENSE)

[npm-image]: https://img.shields.io/npm/v/compressible.svg?style=flat
[npm-url]: https://npmjs.org/package/compressible
[node-version-image]: https://img.shields.io/badge/node.js-%3E%3D_0.6-brightgreen.svg?style=flat
[node-version-url]: http://nodejs.org/download/
[travis-image]: https://img.shields.io/travis/jshttp/compressible.svg?style=flat
[travis-url]: https://travis-ci.org/jshttp/compressible
[coveralls-image]: https://img.shields.io/coveralls/jshttp/compressible.svg?style=flat
[coveralls-url]: https://coveralls.io/r/jshttp/compressible?branch=master
[downloads-image]: https://img.shields.io/npm/dm/compressible.svg?style=flat
[downloads-url]: https://npmjs.org/package/compressible
