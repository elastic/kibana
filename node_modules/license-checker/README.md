NPM License Checker
===================


Ever needed to see all the license info for a module and it's dependencies?

It's this easy:

```
npm install -g license-checker

mkdir foo
cd foo
npm install yui-lint
license-checker
```

You should see something like this:

```
scanning ./yui-lint
├─ cli@0.4.3
│  ├─ repository: http://github.com/chriso/cli
│  └─ licenses: MIT
├─ glob@3.1.14
│  ├─ repository: https://github.com/isaacs/node-glob
│  └─ licenses: UNKNOWN
├─ graceful-fs@1.1.14
│  ├─ repository: https://github.com/isaacs/node-graceful-fs
│  └─ licenses: UNKNOWN
├─ inherits@1.0.0
│  ├─ repository: https://github.com/isaacs/inherits
│  └─ licenses: UNKNOWN
├─ jshint@0.9.1
│  └─ licenses: MIT
├─ lru-cache@1.0.6
│  ├─ repository: https://github.com/isaacs/node-lru-cache
│  └─ licenses: MIT
├─ lru-cache@2.0.4
│  ├─ repository: https://github.com/isaacs/node-lru-cache
│  └─ licenses: MIT
├─ minimatch@0.0.5
│  ├─ repository: https://github.com/isaacs/minimatch
│  └─ licenses: MIT
├─ minimatch@0.2.9
│  ├─ repository: https://github.com/isaacs/minimatch
│  └─ licenses: MIT
├─ sigmund@1.0.0
│  ├─ repository: https://github.com/isaacs/sigmund
│  └─ licenses: UNKNOWN
└─ yui-lint@0.1.1
   ├─ licenses: BSD
      └─ repository: http://github.com/yui/yui-lint
```

Options
-------

* `--unknown` to only show licenses that it can't determine or guess at (from README)
* `--json` output in json format.
* `--csv` output in csv format.
* `--out [filepath]` write the data to a specific file.

Examples
--------

```
license-checker --json > /path/to/licenses.json
license-checker --csv --out /path/to/licenses.csv
license-checker --unknown
```

Requiring
---------


```js
var checker = require('license-checker');

checker.init({
    start: '/path/to/start/looking'
}, function(json) {
    //The sorted json data
});
```

build status
------------

[![Build Status](https://travis-ci.org/davglass/license-checker.png?branch=master)](https://travis-ci.org/davglass/license-checker)
