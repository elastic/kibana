
node-fetch
==========

[![npm version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![coverage status][coveralls-image]][coveralls-url]

A light-weight module that brings `window.fetch` to node.js & io.js


# Motivation

I really like the notion of Matt Andrews' [isomorphic-fetch](https://github.com/matthew-andrews/isomorphic-fetch): it bridges the API gap between client-side and server-side http requests, so developers have less to worry about.

Instead of implementing `XMLHttpRequest` in node to run browser-specific [fetch polyfill](https://github.com/github/fetch), why not go from node's `http` to `fetch` API directly? Node has native stream support, browserify build targets (browsers) don't, so underneath they are going to be vastly different anyway.

Hence `node-fetch`, minimal code for a `window.fetch` compatible API on node.js/io.js runtime.


# Features

- Stay consistent with `window.fetch` API.
- Make conscious trade-off when following [whatwg fetch spec](https://fetch.spec.whatwg.org/) and [stream spec](https://streams.spec.whatwg.org/) implementation details, document known difference.
- Use native promise, but allow substituting it with [insert your favorite promise library].
- Use native stream for body, on both request and response.
- Decode content encoding (gzip/deflate) properly, and convert string output (such as `res.text()` and `res.json()`) to utf-8 automatically.
- Useful extensions such as timeout, redirect limit, response size limit.


# Difference from client-side fetch

- See [Known Differences](https://github.com/bitinn/node-fetch/blob/master/LIMITS.md) for details.
- If you happen to use a missing feature that `window.fetch` offers, feel free to open an issue.
- Pull requests are welcomed too!


# Install

`npm install node-fetch --save`


# Usage

```javascript
var fetch = require('node-fetch');

// If you are not on node v0.12, set a Promise library first, eg.
// fetch.Promise = require('bluebird');

// plain text or html

fetch('https://github.com/')
	.then(function(res) {
		return res.text();
	}).then(function(body) {
		console.log(body);
	});

// json

fetch('https://api.github.com/users/github')
	.then(function(res) {
		return res.json();
	}).then(function(json) {
		console.log(json);
	});

// meta

fetch('https://github.com/')
	.then(function(res) {
		console.log(res.ok);
		console.log(res.status);
		console.log(res.statusText);
		console.log(res.headers.raw());
		console.log(res.headers.get('content-type'));
	});

// post

fetch('http://httpbin.org/post', { method: 'POST', body: 'a=1' })
	.then(function(res) {
		return res.json();
	}).then(function(json) {
		console.log(json);
	});

// post with stream from resumer

var resumer = require('resumer');
var stream = resumer().queue('a=1').end();
fetch('http://httpbin.org/post', { method: 'POST', body: stream })
	.then(function(res) {
		return res.json();
	}).then(function(json) {
		console.log(json);
	});

// post with form-data (detect multipart)

var FormData = require('form-data');
var form = new FormData();
form.append('a', 1);
fetch('http://httpbin.org/post', { method: 'POST', body: form })
	.then(function(res) {
		return res.json();
	}).then(function(json) {
		console.log(json);
	});

// post with form-data (custom headers)

var FormData = require('form-data');
var form = new FormData();
form.append('a', 1);
fetch('http://httpbin.org/post', { method: 'POST', body: form, headers: form.getHeaders() })
	.then(function(res) {
		return res.json();
	}).then(function(json) {
		console.log(json);
	});

// node 0.11+, yield with co

var co = require('co');
co(function *() {
	var res = yield fetch('https://api.github.com/users/github');
	var json = yield res.json();
	console.log(res);
});
```

See [test cases](https://github.com/bitinn/node-fetch/blob/master/test/test.js) for more examples.


# API

## fetch(url, options)

Returns a `Promise`

### Url

Should be an absolute url, eg `http://example.com/`

### Options

default values are shown, note that only `method`, `headers` and `body` are allowed in `window.fetch`, others are node.js extensions.

```
{
	method: 'GET'
	, headers: {}     // request header, format {a:1} or {b:[1,2,3]}
	, follow: 20      // maximum redirect count, 0 to not follow redirect
	, timeout: 0      // req/res timeout in ms, 0 to disable, timeout reset on redirect
	, compress: true  // support gzip/deflate content encoding, false to disable
	, size: 0         // maximum response body size in bytes, 0 to disable
	, body: empty     // request body, can be a string or readable stream
	, agent: null     // custom http.Agent instance
}
```


# License

MIT


# Acknowledgement

Thanks to [github/fetch](https://github.com/github/fetch) for providing a solid implementation reference.


[npm-image]: https://img.shields.io/npm/v/node-fetch.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/node-fetch
[travis-image]: https://img.shields.io/travis/bitinn/node-fetch.svg?style=flat-square
[travis-url]: https://travis-ci.org/bitinn/node-fetch
[coveralls-image]: https://img.shields.io/coveralls/bitinn/node-fetch.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/bitinn/node-fetch
