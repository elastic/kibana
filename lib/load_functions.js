var _ = require('lodash');
var glob = require('glob');
var path = require('path');

module.exports = function (directory) {
  var functions = _.chain(glob.sync(path.resolve(__dirname, '../' + directory + '/*.js'))).map(function (file) {
    var fnName = file.substring(file.lastIndexOf('/') + 1, file.lastIndexOf('.'));
    var func = require('../' + directory + '/' + fnName + '.js');

    return [fnName, require('../' + directory + '/' + fnName + '.js')];
  }).zipObject().value();

  _.each(functions, function (func, name) {
    if (func.aliases) {
      _.each(func.aliases, function (alias) {
        var aliasFn = _.clone(func);
        aliasFn.isAlias = true;
        functions[alias] = aliasFn;
      });
    }
  });

  return functions;
};