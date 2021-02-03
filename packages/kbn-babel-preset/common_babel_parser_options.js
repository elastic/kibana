/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// The @babel/parser options documentation can be found here:
// https://babeljs.io/docs/en/babel-parser#options
module.exports = {
  sourceType: 'unambiguous',
  plugins: [
    'asyncGenerators',
    'classProperties',
    'classPrivateProperties',
    'classPrivateMethods',
    'dynamicImport',
    'exportDefaultFrom',
    'exportNamespaceFrom',
    'objectRestSpread',
    'throwExpressions',
  ],
};
