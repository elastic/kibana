# etag

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Node.js Version][node-version-image]][node-version-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]

Create simple ETags

## Installation

```sh
$ npm install etag
```

## API

```js
var etag = require('etag')
```

### etag(entity, [options])

Generate a strong ETag for the given entity. This should be the complete
body of the entity. Strings, `Buffer`s, and `fs.Stats` are accepted. By
default, a strong ETag is generated except for `fs.Stats`, which will
generate a weak ETag (this can be overwritten by `options.weak`).

```js
res.setHeader('ETag', etag(body))
```

#### Options

`etag` accepts these properties in the options object.

##### weak

Specifies if a "strong" or a "weak" ETag will be generated. The ETag can only
really be a strong as the given input.

## Testing

```sh
$ npm test
```

## Benchmark

```bash
$ npm run-script bench

> etag@1.2.0 bench nodejs-etag
> node benchmark/index.js

> node benchmark/body0-100b.js

  100B body

  1 test completed.
  2 tests completed.
  3 tests completed.
  4 tests completed.

  buffer - strong x   518,895 ops/sec ±1.71% (185 runs sampled)
* buffer - weak   x 1,917,975 ops/sec ±0.34% (195 runs sampled)
  string - strong x   245,251 ops/sec ±0.90% (190 runs sampled)
  string - weak   x   442,232 ops/sec ±0.21% (196 runs sampled)

> node benchmark/body1-1kb.js

  1KB body

  1 test completed.
  2 tests completed.
  3 tests completed.
  4 tests completed.

  buffer - strong x 309,748 ops/sec ±0.99% (191 runs sampled)
* buffer - weak   x 352,402 ops/sec ±0.20% (198 runs sampled)
  string - strong x 159,058 ops/sec ±1.83% (191 runs sampled)
  string - weak   x 184,052 ops/sec ±1.30% (189 runs sampled)

> node benchmark/body2-5kb.js

  5KB body

  1 test completed.
  2 tests completed.
  3 tests completed.
  4 tests completed.

* buffer - strong x 110,157 ops/sec ±0.60% (194 runs sampled)
* buffer - weak   x 111,333 ops/sec ±0.67% (194 runs sampled)
  string - strong x  62,091 ops/sec ±3.92% (186 runs sampled)
  string - weak   x  60,681 ops/sec ±3.98% (186 runs sampled)

> node benchmark/body3-10kb.js

  10KB body

  1 test completed.
  2 tests completed.
  3 tests completed.
  4 tests completed.

* buffer - strong x 61,843 ops/sec ±0.44% (197 runs sampled)
* buffer - weak   x 61,687 ops/sec ±0.52% (197 runs sampled)
  string - strong x 41,377 ops/sec ±3.33% (189 runs sampled)
  string - weak   x 41,368 ops/sec ±3.29% (190 runs sampled)

> node benchmark/body4-100kb.js

  100KB body

  1 test completed.
  2 tests completed.
  3 tests completed.
  4 tests completed.

* buffer - strong x 6,874 ops/sec ±0.17% (198 runs sampled)
* buffer - weak   x 6,880 ops/sec ±0.15% (198 runs sampled)
  string - strong x 5,382 ops/sec ±2.17% (192 runs sampled)
  string - weak   x 5,361 ops/sec ±2.23% (192 runs sampled)
```

## License

[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/etag.svg?style=flat
[npm-url]: https://npmjs.org/package/etag
[node-version-image]: https://img.shields.io/node/v/etag.svg?style=flat
[node-version-url]: http://nodejs.org/download/
[travis-image]: https://img.shields.io/travis/jshttp/etag.svg?style=flat
[travis-url]: https://travis-ci.org/jshttp/etag
[coveralls-image]: https://img.shields.io/coveralls/jshttp/etag.svg?style=flat
[coveralls-url]: https://coveralls.io/r/jshttp/etag?branch=master
[downloads-image]: https://img.shields.io/npm/dm/etag.svg?style=flat
[downloads-url]: https://npmjs.org/package/etag
