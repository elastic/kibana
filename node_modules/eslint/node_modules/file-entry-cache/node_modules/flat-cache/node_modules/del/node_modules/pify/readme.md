# pify [![Build Status](https://travis-ci.org/sindresorhus/pify.svg?branch=master)](https://travis-ci.org/sindresorhus/pify)

> Promisify a callback-style function


## Install

```
$ npm install --save pify
```


## Usage

```js
const fs = require('fs');
const pify = require('pify');

pify(fs.readFile)('package.json', 'utf8').then(data => {
	console.log(JSON.parse(data).name);
	//=> 'pify'
});

// promisify all methods in a module
const promiseFs = pify.all(fs);

promiseFs.readFile('package.json', 'utf8').then(data => {
	console.log(JSON.parse(data).name);
	//=> 'pify'
});
```


## API

### pify(input, [promiseModule], [options])

Returns a promise wrapped version of the supplied function.

#### input

Type: `function`

Callback-style function.

### pify.all(module, [promiseModule], [options])

Returns a version of the module with all its methods promisified.

#### module

Type: `object`

Module whose methods you want to promisify.

#### promiseModule

Type: `function`

Custom promise module to use instead of the native one.

Check out [`pinkie-promise`](https://github.com/floatdrop/pinkie-promise) if you need a tiny promise polyfill.

#### options

##### multiArgs

Type: `boolean`  
Default: `false`

By default, the promisified function will only return the second argument from the callback, which works fine for most APIs. This option can be useful for modules like `request` that return multiple arguments. Turning this on will make it return an array of all arguments from the callback, excluding the error argument, instead of just the second argument.

```js
const request = require('request');
const pify = require('pify');

pify(request, {multiArgs: true})('http://sindresorhus.com').then(result => {
	const [httpResponse, body] = result;
});
```

##### include

Type: `array`

*Works for `pify.all()` only.*

Pick which methods in a module to promisify. Remaining methods will be left untouched.

##### exclude

Type: `array`

*Works for `pify.all()` only.*

Pick which methods in a module **not** to promisify.

##### excludeMain

Type: `boolean`  
Default: `false`

*Works for `pify.all()` only.*

By default, if given `module` is a function itself, this function will be promisified. Turn this option on if you want to promisify only methods of the module.

```js
const pify = require('pify');

function fn() {
	return true;
}

fn.method = (data, callback) => {
	setImmediate(() => {
		callback(data, null);
	});
};

// promisify methods but not fn()
const promiseFn = pify.all(fn, {excludeMain: true});

if (promiseFn()) {
	promiseFn.method('hi').then(data => {
		console.log(data);
	});
}
```


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
