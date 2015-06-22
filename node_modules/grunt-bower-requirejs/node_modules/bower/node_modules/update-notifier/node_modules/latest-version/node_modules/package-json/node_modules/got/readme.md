# got [![Build Status](https://travis-ci.org/sindresorhus/got.svg?branch=master)](https://travis-ci.org/sindresorhus/got)

> Simplified HTTP/HTTPS requests

A nicer interface to the built-in [`http`](http://nodejs.org/api/http.html) module.

It also supports following redirects and automagically handling gzip/deflate.

Use [request](https://github.com/mikeal/request) if you need more.


## Install

```sh
$ npm install --save got
```


## Usage

```js
var got = require('got');

got('http://todomvc.com', function (err, data) {
	console.log(data);
	//=> <!doctype html> ...
});
```


### API

It's a `GET` request by default, but can be changed in `options`.

#### got(url, [options], [callback])

##### url

*Required*  
Type: `string`

The url to request.

##### options

Type: `object`

Any of the [`http.request`](http://nodejs.org/api/http.html#http_http_request_options_callback) options.

##### callback(err, data)


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
