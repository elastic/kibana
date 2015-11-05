# get-stdin [![Build Status](https://travis-ci.org/sindresorhus/get-stdin.svg?branch=master)](https://travis-ci.org/sindresorhus/get-stdin)

> Get stdin as a string or buffer


## Install

```
$ npm install --save get-stdin
```


## Usage

```js
// example.js
const stdin = require('get-stdin');

stdin.then(x => {
	console.log(x);
	//=> 'unicorns'
});
```

```
$ echo unicorns | node example.js
unicorns
```


## API

### stdin()

Get `stdin` as a string.

Returns a promise.

### stdin.buffer()

Get `stdin` as a buffer.

Returns a promise.


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
