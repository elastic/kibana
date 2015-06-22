# jpegtran-bin [![Build Status](https://secure.travis-ci.org/imagemin/jpegtran-bin.svg?branch=master)](http://travis-ci.org/imagemin/jpegtran-bin)

jpegtran 1.3 (part of [libjpeg-turbo](http://libjpeg-turbo.virtualgl.org/)) Node.js wrapper that makes it seamlessly available as a local dependency on OS X, Linux, FreeBSD, Solaris and Windows. Most commonly used to losslessly minify JPEG images.

> libjpeg-turbo is a derivative of libjpeg that uses SIMD instructions (MMX, SSE2, NEON) to accelerate baseline JPEG compression and decompression on x86, x86-64, and ARM systems. On such systems, libjpeg-turbo is generally 2-4x as fast as the unmodified version of libjpeg, all else being equal.


## Install

```bash
$ npm install --save jpegtran-bin
```


## Usage

```js
var execFile = require('child_process').execFile;
var jpegtran = require('jpegtran-bin').path;

execFile(jpegtran, ['-outfile', 'output.jpg', 'input.jpg'], function (err) {
	if (err) {
		throw err;
	}

    console.log('Image minified!');
});
```


## CLI

```bash
$ npm install --global jpegtran-bin
```

```bash
$ jpegtran --help
```


## Development

Instructions for manually compiling jpegtran:

### OS X and Linux

```bash
$ npm install
```

The `nasm` (Netwide Assember) package is required to build the binary on Ubuntu.

### Windows

* Download the [Windows files 32/64-bit](http://sourceforge.net/projects/libjpeg-turbo/files/) (GCC compiled) on a Windows machine
* Run the downloaded file to extract
* In the extracted folder go to the `bin` folder and copy `jpegtran.exe` and `libjpeg-62.dll` to `jpegtran-bin/vendor/` folder


## License

Everything excluding the binaries licensed under the [BSD license](http://opensource.org/licenses/bsd-license.php) and copyright Google.

libjpeg-turbo licensed under the BSD license and copyright dcommander.
