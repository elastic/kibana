/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Fs = require('fs');
const Path = require('path');

const { REPO_ROOT } = require('@kbn/dev-utils');

// process.env.CI_PARALLEL_PROCESS_NUMBER
const KIBANA_ROOT = Path.resolve(__dirname, '../../../../../');
const KIBANA_ROOT2 = Fs.realpathSync(REPO_ROOT).includes(
  `parallel${Path.separator}${process.env.CI_PARALLEL_PROCESS_NUMBER}${Path.separator}`
)
  ? Fs.realpathSync(REPO_ROOT).replace(
      `parallel${Path.separator}${process.env.CI_PARALLEL_PROCESS_NUMBER}${Path.separator}`,
      ''
    )
  : Fs.realpathSync(REPO_ROOT);
const testMap = [
  Path.resolve(KIBANA_ROOT2, 'test'),
  Path.resolve(KIBANA_ROOT2, 'x-pack/test'),
  Path.resolve(KIBANA_ROOT2, 'examples'),
  Path.resolve(KIBANA_ROOT2, 'x-pack/examples'),
  // TODO: should should probably remove this link back to the source
  Path.resolve(KIBANA_ROOT2, 'x-pack/plugins/task_manager/server/config.ts'),
  Path.resolve(KIBANA_ROOT2, 'src/core/utils/default_app_categories.ts'),
];

const testMap2 = testMap.map((path) => Fs.realpathSync(path));

console.log('SIMPLE REPO ROOT: ');
console.log(Path.resolve(REPO_ROOT, 'test'));
console.log('REAL PATH REPO ROOT: ');
console.log(require('fs').realpathSync(Path.resolve(REPO_ROOT, 'test')));
console.log('KBN ROOT: ');
console.log(Path.resolve(KIBANA_ROOT, 'test'));
console.log('TEST PATHS: ');
console.log(testMap);
console.log('TEST PATHS 2: ');
console.log(testMap2);
// throw new Error('FAIL CI');

// modifies all future calls to require() to automatically
// compile the required source with babel
require('@babel/register')({
  ignore: [/[\/\\](node_modules|target|dist)[\/\\]/],
  // only: [
  //   Path.resolve(REPO_ROOT, 'test'),
  //   Path.resolve(REPO_ROOT, 'x-pack/test'),
  //   Path.resolve(REPO_ROOT, 'examples'),
  //   Path.resolve(REPO_ROOT, 'x-pack/examples'),
  //   // TODO: should should probably remove this link back to the source
  //   Path.resolve(REPO_ROOT, 'x-pack/plugins/task_manager/server/config.ts'),
  //   Path.resolve(REPO_ROOT, 'src/core/utils/default_app_categories.ts'),
  // ].map((path) => Fs.realpathSync(path)),
  only: testMap,
  babelrc: false,
  presets: [require.resolve('@kbn/babel-preset/node_preset')],
  extensions: ['.js', '.ts', '.tsx'],
});
