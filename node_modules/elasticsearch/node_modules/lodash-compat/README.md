# lodash-compat v3.10.1

The [compatibility build](https://github.com/lodash/lodash/wiki/Build-Differences) of [lodash](https://lodash.com/) exported as [Node.js](http://nodejs.org/)/[io.js](https://iojs.org/) modules.

Generated using [lodash-cli](https://www.npmjs.com/package/lodash-cli):
```bash
$ lodash modularize compat exports=node -o ./
$ lodash compat -d -o ./index.js
```

## Installation

Using npm:

```bash
$ {sudo -H} npm i -g npm
$ npm i --save lodash-compat
```

In Node.js/io.js:

```js
// load the compatibility build
var _ = require('lodash-compat');
// or a method category
var array = require('lodash-compat/array');
// or a method
var chunk = require('lodash-compat/array/chunk');
```

See the [package source](https://github.com/lodash/lodash-compat/tree/3.10.1-npm) for more details.

**Note:**<br>
Don’t assign values to the [special variable](http://nodejs.org/api/repl.html#repl_repl_features) `_` when in the REPL.<br>
Install [n_](https://www.npmjs.com/package/n_) for a REPL that includes lodash by default.
