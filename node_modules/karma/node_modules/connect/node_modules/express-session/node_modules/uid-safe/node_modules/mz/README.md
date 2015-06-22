
# MZ - Modernize node.js

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Dependency Status][david-image]][david-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]
[![Gittip][gittip-image]][gittip-url]

Modernize node.js to current ECMAScript specifications!
node.js will not update their API to ES6+ [for a while](https://github.com/joyent/node/issues/7549).
This library is a wrapper for various aspects of node.js' API.

## Installation and Usage

Set `mz` as a dependency and install it.

```bash
npm i mz
```

Then prefix the relevant `require()`s with `mz/`:

```js
var fs = require('mz/fs')

fs.exists(__filename).then(function (exists) {
  if (exists) // do something
})
```

Personally, I use this with generator-based control flow libraries such as [co](https://github.com/visionmedia/co) so I don't need to use implementation-specific wrappers like [co-fs](https://github.com/visionmedia/co-fs).

```js
var co = require('co')
var fs = require('mz/fs')

co(function* () {
  if (yield fs.exists(__filename)) // do something
})()
```

## Promisification

Many node methods are converted into promises.
Any properties that are deprecated or aren't asynchronous will simply be proxied.
The modules wrapped are:

- `child_process`
- `crypto`
- `dns`
- `fs`
- `zlib`

```js
var exec = require('mz/child_process').exec

exec('node --version').then(function (stdout) {
  console.log(stdout)
})
```

## Promise Engine

If you've installed [bluebird][bluebird],
[bluebird][bluebird] will be used.
`mz` does not install [bluebird][bluebird] for you.

Otherwise, if you're using a node that has native v8 Promises (v0.11.13+),
then that will be used.

Otherwise, this library will crash the process and exit,
so you might as well install [bluebird][bluebird] as a dependency!

## FAQ

### Can I use this in production?

If you do, you should probably install [bluebird][bluebird] as
native v8 promises are still pretty raw.

### Will this make my app faster?

Nope, probably slower actually.

### Can I add more features?

Sure.
Open an issue.

Currently, the plans are to eventually support:

- ECMAScript7 Streams

[bluebird]: https://github.com/petkaantonov/bluebird

[npm-image]: https://img.shields.io/npm/v/mz.svg?style=flat-square
[npm-url]: https://npmjs.org/package/mz
[github-tag]: http://img.shields.io/github/tag/normalize/mz.svg?style=flat-square
[github-url]: https://github.com/normalize/mz/tags
[travis-image]: https://img.shields.io/travis/normalize/mz.svg?style=flat-square
[travis-url]: https://travis-ci.org/normalize/mz
[coveralls-image]: https://img.shields.io/coveralls/normalize/mz.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/normalize/mz?branch=master
[david-image]: http://img.shields.io/david/normalize/mz.svg?style=flat-square
[david-url]: https://david-dm.org/normalize/mz
[license-image]: http://img.shields.io/npm/l/mz.svg?style=flat-square
[license-url]: LICENSE.md
[downloads-image]: http://img.shields.io/npm/dm/mz.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/mz
[gittip-image]: https://img.shields.io/gittip/jonathanong.svg?style=flat-square
[gittip-url]: https://www.gittip.com/jonathanong/
