let _ = require('lodash');
let glob = require('glob');
let path = require('path');
let processFunctionDefinition = require('./process_function_definition');

module.exports = function (directory) {

  function getTuple(directory, name) {
    let func = require('../' + directory + '/' + name);
    return [name, require('../' + directory + '/' + name)];
  }

  // Get a list of all files and use the filename as the object key
  let files = _.map(glob.sync(path.resolve(__dirname, '../' + directory + '/*.js')), function (file) {
    let name = file.substring(file.lastIndexOf('/') + 1, file.lastIndexOf('.'));
    return getTuple(directory, name);
  });

  // Get a list of all directories with an index.js, use the directory name as the key in the object
  let directories = _.chain(glob.sync(path.resolve(__dirname, '../' + directory + '/*/index.js')))
  .filter(function (file) {
    return file.match(/__test__/) == null;
  })
  .map(function (file) {
    let parts = file.split('/');
    let name = parts[parts.length - 2];
    return getTuple(directory, parts[parts.length - 2]);
  }).value();

  let functions = _.zipObject(files.concat(directories));

  _.each(functions, function (func) {
    _.assign(functions, processFunctionDefinition(func));
  });

  return functions;
};
