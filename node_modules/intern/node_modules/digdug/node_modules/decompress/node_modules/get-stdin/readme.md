# get-stdin [![Build Status](https://travis-ci.org/sindresorhus/get-stdin.png?branch=master)](https://travis-ci.org/sindresorhus/get-stdin)

> Easier stdin


## Install

```
npm install --save get-stdin
```


## Example

```js
// example.js
var stdin = require('get-stdin');

stdin(function (data) {
	console.log(data);
	//=> unicorns
});
```

```
$ echo unicorns | node example.js
```


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
