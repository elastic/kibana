/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const Path = require('path');

const { REPO_ROOT } = require('@kbn/dev-utils');

// modifies all future calls to require() to automatically
// compile the required source with babel
require('@babel/register')({
  ignore: [/[\/\\](node_modules|target|dist)[\/\\]/],
  only: [
    Path.resolve(REPO_ROOT, 'test'),
    Path.resolve(REPO_ROOT, 'x-pack/test'),
    Path.resolve(REPO_ROOT, 'examples'),
    Path.resolve(REPO_ROOT, 'x-pack/examples'),
    // TODO: should should probably remove this link back to the source
    Path.resolve(REPO_ROOT, 'x-pack/plugins/task_manager/server/config.ts'),
  ],
  babelrc: false,
  presets: [require.resolve('@kbn/babel-preset/node_preset')],
  extensions: ['.js', '.ts', '.tsx'],
});
