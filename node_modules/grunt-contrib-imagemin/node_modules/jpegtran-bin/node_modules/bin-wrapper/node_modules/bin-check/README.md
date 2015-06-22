# bin-check [![Build Status](https://travis-ci.org/kevva/bin-check.svg?branch=master)](https://travis-ci.org/kevva/bin-check)

> Check if a binary is working by checking its exit code

## Install

```bash
$ npm install --save bin-check
```

## Usage

```js
var binCheck = require('bin-check');

binCheck('/bin/sh', ['--version'], function (err, works, msg) {
    if (err) {
        throw err;
    }
    
    console.log(msg);
    // => GNU bash, version 3.2.51(1)-release-(x86_64-apple-darwin13)

    console.log(works);
    // => true
});
```

## API

### binCheck(name, cmd, cb)

Check if a binary is working by checking its exit code. Use `cmd` to test against
custom commands. Defaults to `--help`.

## License

MIT © [Kevin Mårtensson](https://github.com/kevva)
