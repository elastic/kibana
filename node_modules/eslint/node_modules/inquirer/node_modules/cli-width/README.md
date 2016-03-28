cli-width
=========

Get stdout window width, with three fallbacks, `tty`, a custom environment variable and then a default.

[![npm version](https://badge.fury.io/js/cli-width.svg)](http://badge.fury.io/js/cli-width)
[![Build Status](https://travis-ci.org/knownasilya/cli-width.svg)](https://travis-ci.org/knownasilya/cli-width)
[![Coverage Status](https://coveralls.io/repos/knownasilya/cli-width/badge.svg?branch=master&service=github)](https://coveralls.io/github/knownasilya/cli-width?branch=master)

## Usage

```
npm install --save cli-width
```

```js
'use stict';

var cliWidth = require('cli-width');

cliWidth(); // maybe 204 :)
```

You can also set the `CLI_WIDTH` environment variable.

If none of the methods are supported, and the environment variable isn't set,
the default is `0` and can be changed via `cliWidth.defaultWidth = 200;`.

## Tests

```bash
npm install
npm test
```

Coverage can be generated with `npm run coverage`.
