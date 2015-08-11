var _ = require('lodash');
var glob = require('glob');
var path = require('path');

module.exports = function (directory) {
  return _.chain(glob.sync(path.resolve(__dirname, '../' + directory + '/*.js'))).map(function (file) {
    var fnName = file.substring(file.lastIndexOf('/') + 1, file.lastIndexOf('.'));
    return [fnName, require('../' + directory + '/' + fnName + '.js')];
  }).zipObject().value();
};