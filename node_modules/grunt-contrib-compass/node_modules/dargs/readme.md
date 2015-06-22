# dargs [![Build Status](https://secure.travis-ci.org/sindresorhus/dargs.png?branch=master)](http://travis-ci.org/sindresorhus/dargs)

> Converts an object of options into an array of command-line arguments


## Getting started

Install: `npm install --save dargs`


#### Example

```js
var dargs = require('dargs');

var options = {
	foo: 'bar',
	hello: true,                    // results in only the key being used
	cake: false,                    // ignored
	camelCase: 5,                   // camelCase is slugged to `camel-case`
	multiple: ['value', 'value2'],  // converted to multiple arguments
	sad: ':('
};

var excludes = ['sad'];

console.log(dargs(options, excludes));

/*
[
	'--foo', 'bar',
	'--hello',
	'--camel-case', '5',
	'--multiple', 'value',
	'--multiple', 'value2'
]
*/
```


## Documentation


### options

Object of options to convert to command-line arguments.


### excludes

Array of keys to exclude.



## License

MIT License • © [Sindre Sorhus](http://sindresorhus.com)
