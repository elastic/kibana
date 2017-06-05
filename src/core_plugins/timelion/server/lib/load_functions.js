import _ from 'lodash';
import glob from 'glob';
import path from 'path';
import processFunctionDefinition from './process_function_definition';

module.exports = function (directory) {

  function getTuple(directory, name) {
    return [name, require('../' + directory + '/' + name)];
  }

  // Get a list of all files and use the filename as the object key
  const files = _.map(glob.sync(path.resolve(__dirname, '../' + directory + '/*.js')), function (file) {
    const name = file.substring(file.lastIndexOf('/') + 1, file.lastIndexOf('.'));
    return getTuple(directory, name);
  });

  // Get a list of all directories with an index.js, use the directory name as the key in the object
  const directories = _.chain(glob.sync(path.resolve(__dirname, '../' + directory + '/*/index.js')))
  .filter(function (file) {
    return file.match(/__test__/) == null;
  })
  .map(function (file) {
    const parts = file.split('/');
    const name = parts[parts.length - 2];
    return getTuple(directory, name);
  }).value();

  const functions = _.zipObject(files.concat(directories));

  _.each(functions, function (func) {
    _.assign(functions, processFunctionDefinition(func));
  });

  return functions;
};
