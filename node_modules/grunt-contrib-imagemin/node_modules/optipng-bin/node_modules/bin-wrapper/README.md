# bin-wrapper [![Build Status](https://travis-ci.org/kevva/bin-wrapper.svg?branch=master)](https://travis-ci.org/kevva/bin-wrapper)

> Binary wrapper for Node.js that makes your programs seamlessly available as local dependencies

## Install

```bash
$ npm install --save bin-wrapper
```

## Usage

```js
var BinWrapper = require('bin-wrapper');
var bin = new BinWrapper({ global: true });

bin
    .src('https://raw.github.com/yeoman/node-jpegtran-bin/0.2.4/vendor/win/x64/jpegtran.exe', 'win32', 'x64')
    .src('https://raw.github.com/yeoman/node-jpegtran-bin/0.2.4/vendor/win/x64/libjpeg-62.dll', 'win32', 'x64')
    .dest('vendor')
    .use('jpegtran.exe')
    .run(['--version'], function (err) {
        if (err) {
            throw err;
        }

        console.log('jpegtran is working');
    });
```

Get the path to your binary with `bin.use`:

```js
console.log(bin.use()); // => path/to/vendor/jpegtran.exe
```

## API

### new BinWrapper(opts)

Creates a new `BinWrapper` instance. Use the `global` option to enable or disable global checking.

### .src(str)

Accepts a URL pointing to a file to download.

### .dest(str)

Accepts a path which the files will be downloaded to.

### .use(str)

Define which file to use as the binary.

### .run(cmd, cb)

Runs the search for the binary. If no binary is found it will download the file using the URL
provided in `.src()`. It will also check that the binary is working by running it using `cmd`
and checking it's exit code.

## Options

### global

Type: `Boolean`  
Default: `true`

Whether to check for a binary globally or not.

## License

MIT © [Kevin Mårtensson](http://kevinmartensson.com)
