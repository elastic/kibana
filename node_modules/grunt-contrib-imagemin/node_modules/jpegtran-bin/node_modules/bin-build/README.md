# bin-build [![Build Status](https://travis-ci.org/kevva/bin-build.svg?branch=master)](https://travis-ci.org/kevva/bin-build)

> Easily build binaries

## Install

```bash
$ npm install --save bin-build
```

## Usage

```js
var BinBuild = require('bin-build');
var build = new BinBuild();

build
    .src('http://www.lcdf.org/gifsicle/gifsicle-1.80.tar.gz')
    .cfg('./configure --disable-gifview --disable-gifdiff')
    .make('make install')
    .build(function (err) {
        if (err) {
            throw err;
        }

        console.log('gifsicle built successfully');
    });
```

## API

### new BinBuild

Creates a new `BinBuild` instance.

### .src(str)

Accepts a URL to a archive containing the source code.

### .cfg(str)

String with configuration options to be run before `make`.

### .make(str)

String with `make` commands.

### .build(cb)

Runs the build.

## License

MIT © [Kevin Mårtensson](https://github.com/kevva)
