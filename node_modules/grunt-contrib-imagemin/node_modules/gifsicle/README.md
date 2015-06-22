# gifsicle-bin [![Build Status](https://secure.travis-ci.org/imagemin/gifsicle-bin.svg?branch=master)](http://travis-ci.org/imagemin/gifsicle-bin)

[gifsicle](http://www.lcdf.org/gifsicle/) 1.71 Node.js wrapper that makes it seamlessly available as a local dependency on OS X, Linux and Windows.

> gifsicle manipulates GIF image files in many different ways. Depending on command line options, it can merge several GIFs into a GIF animation; explode an animation into its component frames; change individual frames in an animation; turn interlacing on and off; add transparency and much more.

## Install

```bash
$ npm install --save gifsicle
```

## Usage

```js
var execFile = require('child_process').execFile;
var gifsicle = require('gifsicle').path;

execFile(gifsicle, ['-o', 'output.gif', 'input.gif'], function (err) {
	if (err) {
		throw err;
	}

	console.log('Image minified');
});
```

## CLI

```bash
$ npm install --global gifsicle
```

```bash
$ gifsicle --help
```

## Development

Instructions for updating the binaries:

### OS X and Linux

```bash
$ npm install
```

### Windows

* Download the [Windows files 32/64-bit](http://www.lcdf.org/gifsicle/) on a Windows machine
* Run the downloaded file to extract
* Go to the `bin` folder at the destination and copy `gifsicle.exe` to the `gifsicle/vendor/` folder

## License

Everything excluding the binaries licensed under the [BSD license](http://opensource.org/licenses/bsd-license.php) and copyright Google.

gifsicle licensed under the GNU General Public License, Version 2.
