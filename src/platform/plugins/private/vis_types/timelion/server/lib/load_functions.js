/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import globby from 'globby';
import processFunctionDefinition from './process_function_definition';

export default function (directory) {
  function getTuple(directory, name) {
    return [name, require('../' + directory + '/' + name)]; // eslint-disable-line import/no-dynamic-require
  }

  // Get a list of all files and use the filename as the object key
  const files = _.map(
    globby
      .sync('../' + directory + '/*.js', { cwd: __dirname })
      .filter((filename) => !filename.includes('.test')),
    function (file) {
      const name = file.substring(file.lastIndexOf('/') + 1, file.lastIndexOf('.'));
      return getTuple(directory, name);
    }
  );

  // Get a list of all directories with an index.js, use the directory name as the key in the object
  const directories = _.chain(
    globby.sync('../' + directory + '/*/index.js', {
      cwd: __dirname,
    })
  )
    .map(function (file) {
      const parts = file.split('/');
      const name = parts[parts.length - 2];
      return getTuple(directory, name);
    })
    .value();

  const functions = _.fromPairs(files.concat(directories));

  _.each(functions, function (func) {
    _.assign(functions, processFunctionDefinition(func));
  });

  return functions;
}
