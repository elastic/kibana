/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Fs = require('fs');
const Path = require('path');

const { REPO_ROOT: REPO_ROOT_FOLLOWING_SYMLINKS } = require('@kbn/utils');
const BASE_REPO_ROOT = Path.resolve(
  Fs.realpathSync(Path.resolve(REPO_ROOT_FOLLOWING_SYMLINKS, 'package.json')),
  '..'
);

const transpileKbnPaths = [
  'test',
  'x-pack/test',
  'examples',
  'x-pack/examples',
  // TODO: should should probably remove this link back to the source
  'x-pack/plugins/task_manager/server/config.ts',
  'src/core/utils/default_app_categories.ts',
  'src/plugins/field_formats/common',
].map((path) => Path.resolve(BASE_REPO_ROOT, path));

// modifies all future calls to require() to automatically
// compile the required source with babel
require('@babel/register')({
  ignore: [/[\/\\](node_modules|target|dist)[\/\\]/],
  only: transpileKbnPaths,
  babelrc: false,
  presets: [require.resolve('@kbn/babel-preset/node_preset')],
  extensions: ['.js', '.ts', '.tsx'],
});
