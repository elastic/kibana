# read-json-sync

[![NPM version](https://img.shields.io/npm/v/read-json-sync.svg)](https://www.npmjs.com/package/read-json-sync)
[![Build Status](https://travis-ci.org/shinnn/read-json-sync.svg?branch=master)](https://travis-ci.org/shinnn/read-json-sync)
[![Build status](https://ci.appveyor.com/api/projects/status/t7sjgpku9on12d32?svg=true)](https://ci.appveyor.com/project/ShinnosukeWatanabe/read-json-sync)
[![Coverage Status](https://img.shields.io/coveralls/shinnn/read-json-sync.svg)](https://david-dm.org/shinnn/read-json-sync)
[![Dependency Status](https://img.shields.io/david/shinnn/read-json-sync.svg?label=deps)](https://david-dm.org/shinnn/read-json-sync)
[![devDependency Status](https://img.shields.io/david/dev/shinnn/read-json-sync.svg?label=devDeps)](https://david-dm.org/shinnn/read-json-sync#info=devDependencies)

A [Node](http://nodejs.org/) module to read and parse a JSON file synchronously

```javascript
var readJsonSync = require('read-json-sync');

readJsonSync('package.json');
//=> {name: 'read-json-sync', version: '1.0.0', ...}
```

Node's built-in [`require`](http://nodejs.org/api/globals.html#globals_require) can do almost the same thing, but this module doesn't [cache](http://nodejs.org/api/modules.html#modules_caching) results.

## Installation

[Use npm](https://docs.npmjs.com/cli/install).

```sh
npm install read-json-sync
```

## API

```javascript
var readJsonSync = require('read-json-sync');
```

### readJsonSync(*filePath* [, *options*])

*filePath*: `String` (path to a JSON file)  
*options*: `Object` ([`fs.readFile`](http://nodejs.org/api/fs.html#fs_fs_readfile_filename_options_callback) options)  
Return: `Object` (parsed JSON data)

## License

Copyright (c) 2014 - 2015 [Shinnosuke Watanabe](https://github.com/shinnn)

Licensed under [the MIT License](./LICENSE).
