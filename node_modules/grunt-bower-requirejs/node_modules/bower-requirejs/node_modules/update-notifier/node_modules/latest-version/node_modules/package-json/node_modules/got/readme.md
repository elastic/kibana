# got [![Build Status](https://travis-ci.org/sindresorhus/got.svg?branch=master)](https://travis-ci.org/sindresorhus/got)

> Simplified HTTP/HTTPS requests

A nicer interface to the built-in [`http`](http://nodejs.org/api/http.html) module.

It also supports following redirects, streams, and automagically handling gzip/deflate.

Use [request](https://github.com/mikeal/request) if you need more.


## Install

```sh
$ npm install --save got
```


## Usage

```js
var got = require('got');

// Callback mode
got('todomvc.com', function (err, data, res) {
	console.log(data);
	//=> <!doctype html> ...
});


// Stream mode
got('todomvc.com').pipe(fs.createWriteStream('index.html'));

// For POST, PUT and PATCH methods got returns a WritableStream
fs.createReadStream('index.html').pipe(got.post('todomvc.com'));
```

### API

It's a `GET` request by default, but can be changed in `options`.

#### got(url, [options], [callback])

##### url

*Required*  
Type: `string`

The URL to request.

##### options

Type: `object`

Any of the [`http.request`](http://nodejs.org/api/http.html#http_http_request_options_callback) options.

##### options.encoding

Type: `string`, `null`  
Default: `'utf8'`

Encoding to be used on `setEncoding` of the response data. If null, the body is returned as a Buffer.

##### options.body

Type: `string`, `Buffer`, `ReadableStream`  

Body, that will be sent with `POST` request. If present in `options` and `options.method` is not set - `options.method` will be set to `POST`.

This option and stream mode are mutually exclusive.

##### options.timeout

Type: `number`

Milliseconds after which the request will be aborted and an error event with `ETIMEDOUT` code will be emitted.

##### options.agent

[http.Agent](http://nodejs.org/api/http.html#http_class_http_agent) instance.

Node HTTP/HTTPS Agent in [0.10](https://github.com/joyent/node/blob/v0.10.35-release/lib/http.js#L1261) by default limits number of open sockets to 5 — which is too low. If `options.agent` is not defined `got` will use [infinity-agent](https://github.com/floatdrop/infinity-agent) to backport `defaultMaxSockets` from [0.11](https://github.com/joyent/node/blob/v0.11.14-release/lib/_http_agent.js#L110).

[Why pooling is evil](https://github.com/substack/hyperquest#pooling-is-evil).

To use default [globalAgent](http://nodejs.org/api/http.html#http_http_globalagent) just pass `null` to this option.

##### callback(err, data, response)

###### err

`Error` object with HTTP status code as `code` property.

###### data

The data you requested.

###### response

The [response object](http://nodejs.org/api/http.html#http_http_incomingmessage).

#### got.get(url, [options], [callback])
#### got.post(url, [options], [callback])
#### got.put(url, [options], [callback])
#### got.patch(url, [options], [callback])
#### got.head(url, [options], [callback])
#### got.delete(url, [options], [callback])

Sets `options.method` to the method name and makes a request.


## Proxy

You can use the [`tunnel`](https://github.com/koichik/node-tunnel) module with the `agent` option to work with proxies:

```js
var got = require('got');
var tunnel = require('tunnel');

got('todomvc.com', {
	agent: tunnel.httpOverHttp({
		proxy: {
			host: 'localhost'
		}
	})
}, function (err, data, res) {});
```


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
