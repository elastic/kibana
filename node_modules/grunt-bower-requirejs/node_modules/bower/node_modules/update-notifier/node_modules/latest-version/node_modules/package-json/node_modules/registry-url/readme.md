# registry-url [![Build Status](https://travis-ci.org/sindresorhus/registry-url.svg?branch=master)](https://travis-ci.org/sindresorhus/registry-url)

> Get the set npm registry URL

It's usually `https://registry.npmjs.org/`, but [configurable](https://www.npmjs.org/doc/misc/npm-config.html#registry).

Use this if you do anything with the npm registry as users will expect it to use their configured registry.


## Install

```sh
$ npm install --save registry-url
```


## Usage

```ini
# .npmrc
registry = 'https://custom-registry.com/'
```

```js
var registryUrl = require('registry-url');

registryUrl(function (err, url) {
	console.log(url);
	//=> https://custom-registry.com/
});
```


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
