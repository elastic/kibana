/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
