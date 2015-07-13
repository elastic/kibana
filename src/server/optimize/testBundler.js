'use strict';

let promify = require('bluebird').promisify;
let glob = promify(require('glob'));
let write = promify(require('fs').writeFile);
let webpack = promify(require('webpack'));
let basename = require('path').basename;

let fromRoot = require('../../utils/fromRoot');
const TEST = fromRoot('test');
const UNIT = fromRoot('test/unit');
const ENTRY = fromRoot('test/unit.specs.entry.js');
const BUNDLE = fromRoot('test/unit.specs.bundle.js');
const SPECS = fromRoot('test/unit/specs/**/*.js');
const NODE_MODULES = fromRoot('node_modules');

module.exports = function () {
  return glob(SPECS, { cwd: '/' })
  .filter(function (path) {
    return basename(path)[0] !== '_';
  })
  .reduce(function (memo, path) {
    return `${memo}\nrequire('${path}');`;
  }, '')
  .then(function (contents) {
    return write(ENTRY, contents, { encoding: 'utf8' });
  })
  .then(function () {
    return webpack({
      context: TEST,
      entry: ENTRY,
      output: {
        path: TEST,
        filename: 'unit.specs.bundle.js'
      }
    });
  })
  .then(function (stats) {
    console.log(stats.toString({ colors: true }));
    return BUNDLE;
  });
};
