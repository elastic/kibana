var _ = require('lodash');
var glob = require('glob');
var path = require('path');
var processFunctionDefinition = require('./process_function_definition');

module.exports = function (directory) {

  function getTuple(directory, name) {
    var func = require('../' + directory + '/' + name);
    return [name, require('../' + directory + '/' + name)];
  }

  // Get a list of all files and use the filename as the object key
  var files = _.map(glob.sync(path.resolve(__dirname, '../' + directory + '/*.js')), function (file) {
    var name = file.substring(file.lastIndexOf('/') + 1, file.lastIndexOf('.'));
    return getTuple(directory, name);
  });

  // Get a list of all directories with an index.js, use the directory name as the key in the object
  var directories = _.chain(glob.sync(path.resolve(__dirname, '../' + directory + '/*/index.js')))
  .filter(function (file) {
    return file.match(/__test__/) == null;
  })
  .map(function (file) {
    var parts = file.split('/');
    var name = parts[parts.length - 2];
    return getTuple(directory, parts[parts.length - 2]);
  }).value();

  var functions = _.zipObject(files.concat(directories));

  _.each(functions, function (func) {
    _.assign(functions, processFunctionDefinition(func));
  });

  return functions;
};
