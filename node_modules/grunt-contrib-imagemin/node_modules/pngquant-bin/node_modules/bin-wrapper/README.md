# bin-wrapper [![Build Status](https://travis-ci.org/kevva/bin-wrapper.svg?branch=master)](https://travis-ci.org/kevva/bin-wrapper)

> Binary wrapper for Node.js that makes your programs seamlessly available as local dependencies

## Install

```bash
$ npm install --save bin-wrapper
```

## Usage

```js
var BinWrapper = require('bin-wrapper');
var bin = new BinWrapper({ bin: 'gifsicle', version: '1.71', dest: 'vendor' });

bin
    .addUrl('https://raw.github.com/yeoman/node-gifsicle/0.1.4/vendor/osx/gifsicle', 'darwin')
    .addUrl('https://raw.github.com/yeoman/node-gifsicle/0.1.4/vendor/linux/x64/gifsicle', 'linux', 'x64')
    .addSource('http://www.lcdf.org/gifsicle/gifsicle-1.71.tar.gz')
    .check()
    .on('error', function (err) {
        console.log(err);
    });
    .on('fail', function () {
        this.build('./configure && make && make install')
    })
    .on('success', function () {
        console.log('gifsicle is working');
    })
    .on('finish', function () {
        console.log('gifsicle rebuilt successfully!')
    })
```

Get the path to your binary with `bin.path`:

```js
console.log(bin.path); // => path/to/vendor/gifsicle
```

## API

### new BinWrapper(opts)

Creates a new `BinWrapper`. Available options are `bin` which is the name of the
binary and `dest` which is where to download/build the binary to.

### .check(cmd)

Check if a binary is present and working. If it isn't, download and test it by
running the binary with `cmd` and see if it exits correctly.

Emits `success` if the binary is working and `fail` if the binary failed to exit with
status code `0`.

### .build(cmd)

Download the source archive defined in the `src` property and build it using the
build script defined in the `cmd` argument.

Emits `finish` when build is finished successfully.

### .addPath(src)

Add a path where to check for the binary. By default `dest` is added to paths.

### .addUrl(url, platform, arch)

Add a URL to download the binary from. Use `platform` and `arch` to target a
specific system.

### .addFile(url, platform, arch)

Add a file to download alongside with the binary. Use `platform` and `arch` to
target a specific system.

### .addSource(url)

Add a URL where to download the source code from.

## Options

### bin

Type: `String`  
Default: `undefined`

Set the name of the binary.

### version

Type: `String`  
Default: `undefined`

Define a specific version.

### global

Type: `Boolean`  
Default: `true`

Whether to check for a binary globally or not.

### dest

Type: `String`  
Default: `process.cwd()`

Destination to download/build binary.

## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License) © [Kevin Mårtensson](http://kevinmartensson.com)
