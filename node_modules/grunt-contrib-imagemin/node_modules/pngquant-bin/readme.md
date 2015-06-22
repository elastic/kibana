# node-pngquant-bin [![Build Status](https://secure.travis-ci.org/sindresorhus/node-pngquant-bin.png?branch=master)](http://travis-ci.org/sindresorhus/node-pngquant-bin)

[pngquant](http://pngquant.org) 1.8.4 Node.js wrapper that makes it seamlessly available as a local dependency on OS X, Linux and Windows.

> pngquant is a command-line utility for converting 24/32-bit PNG images to paletted (8-bit) PNGs. The conversion reduces file sizes significantly (often as much as 70%) and preserves full alpha transparency.


## Install

- Install with [npm](https://npmjs.org/package/pngquant-bin): `npm install --save pngquant-bin`


## Example usage

```js
var execFile = require('child_process').execFile;
var binPath = require('pngquant-bin').path;

execFile(binPath, ['input.png'], function() {
	console.log('Image minified');
});
```

Can also be run directly from `./node_modules/.bin/pngquant`.


## Dev

Note to self on how to update the binaries.

### OS X

- Run `npm install` on a OS X 10.7 machine to build the binary.

### Linux

- Install dependencies by running `sudo apt-get install build-essential libpng-dev zlib1g-dev`.
- Run `npm install` to build the binary.

### Windows

- Download the [Windows binary](http://pngquant.org/pngquant-windows.zip) and put it in `vendor/win/`.


## License

Everything except binaries: MIT License • © [Sindre Sorhus](http://sindresorhus.com)

gifsicle licensed under the GNU General Public License, Version 2.
