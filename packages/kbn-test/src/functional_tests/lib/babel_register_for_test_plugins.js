/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Fs = require('fs');
const Path = require('path');

const { REPO_ROOT: REPO_ROOT_FOLLOWING_SYMLINKS } = require('@kbn/dev-utils');
const BASE_REPO_ROOT = Path.resolve(
  Fs.realpathSync(Path.resolve(REPO_ROOT_FOLLOWING_SYMLINKS, 'package.json')),
  '..'
);

// Jenkins use a special symlink setup between a main checkout at
// /dev/shm/workspace/kibana and a workers on at /dev/shm/workspace/parallel/X/kibana
// We have jobs running at both and as such we need to transpile for both paths.
// Once we no longer run on Jenkins our REPO_ROOT can just be calculated as
// Fs.realpathSync($PATH) where $PATH is any Path.resolve(REPO_ROOT, TRANSPILE_KBN_PATH)
const REPO_ROOT =
  process.env.JENKINS_HOME && !BASE_REPO_ROOT.includes('parallel')
    ? Path.join(
        Path.dirname(BASE_REPO_ROOT),
        'parallel',
        process.env.CI_PARALLEL_PROCESS_NUMBER,
        Path.basename(BASE_REPO_ROOT)
      )
    : BASE_REPO_ROOT;

const transpileKbnBasePaths = [
  'test',
  'x-pack/test',
  'examples',
  'x-pack/examples',
  // TODO: should should probably remove this link back to the source
  'x-pack/plugins/task_manager/server/config.ts',
  'src/core/utils/default_app_categories.ts',
];

const transpileKbnPaths = transpileKbnBasePaths.reduce(
  (prev, curr) => prev.concat([Path.resolve(REPO_ROOT, curr), Path.resolve(BASE_REPO_ROOT, curr)]),
  []
);

console.log('TEST PATHS: ');
console.log(transpileKbnPaths);
throw new Error('WAIT');

// modifies all future calls to require() to automatically
// compile the required source with babel
require('@babel/register')({
  ignore: [/[\/\\](node_modules|target|dist)[\/\\]/],
  only: transpileKbnBasePaths,
  babelrc: false,
  presets: [require.resolve('@kbn/babel-preset/node_preset')],
  extensions: ['.js', '.ts', '.tsx'],
});
