# find-file [![Build Status](https://travis-ci.org/kevva/find-file.png?branch=master)](http://travis-ci.org/kevva/find-file)

Search for a file in an array of paths using Node.js.

## Getting started

Install with npm: `npm install find-file`

## Examples

```js
var findFile = require('find-file');

// search for gifsicle in `vendor` and `../bin`
findFile('gifsicle', { path: ['vendor', '../bin'] });

// search for gifsicle in `vendor` and `../bin` but exclude `PATH`
findFile('gifsicle', { path: ['vendor', '../bin'], global: false });

// search for gifsicle in `vendor` and `PATH` but only return the first one
findFile('gifsicle', { path: 'vendor' })[0];
```

## API

### findFile(name, opts)

Search for a file in an array of paths. By default it will also search for
files in `PATH`.

## Options

### path

Type: `String|Array`  
Default: `undefined`

Paths to search in.

### exclude

Type: `String|Array`  
Default: `undefined`

Paths to exclude.

### global

Type: `Boolean`  
Default: `true`

Whether to search in `PATH`.

## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License) (c) [Kevin Mårtensson](https://github.com/kevva)
