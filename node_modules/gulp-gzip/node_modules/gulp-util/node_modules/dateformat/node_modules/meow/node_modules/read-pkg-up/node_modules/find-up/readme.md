# find-up [![Build Status](https://travis-ci.org/sindresorhus/find-up.svg?branch=master)](https://travis-ci.org/sindresorhus/find-up)

> Find a file by walking up parent directories


## Install

```
$ npm install --save find-up
```


## Usage

```
/
└── Users
    └── sindresorhus
        ├── unicorn.png
        └── foo
            └── bar
                ├── baz
                └── example.js
```

```js
// example.js
var findUp = require('find-up');

findUp('unicorn.png').then(function (filepath) {
	console.log(filepath);
	//=> '/Users/sindresorhus/unicorn.png'
});
```


## API

### findUp(filename, [options])

Returns a promise that resolves to a filepath or `null`.

### findUp.sync(filename, [options])

Returns a filepath or `null`.

#### filename

Type: `string`

Filename of the file to find.

#### options

##### cwd

Type: `string`  
Default: `process.cwd()`

Directory to start from.


## Related

- [find-up-cli](https://github.com/sindresorhus/find-up) - CLI for this module
- [package-root](https://github.com/sindresorhus/package-root) - Find the root of a npm package


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
