let _ = require('lodash');
let { resolve } = require('path');
let { promisify } = require('bluebird');
let { all } = require('bluebird');
let glob = promisify(require('glob'));

module.exports = function (path, patterns) {
  return all([].concat(patterns || []))
  .map(function (pattern) {
    return glob(pattern, { cwd: path, ignore: '**/_*.js' });
  })
  .then(_.flatten)
  .then(_.uniq)
  .map(function (match) {
    return resolve(path, match);
  });
};
