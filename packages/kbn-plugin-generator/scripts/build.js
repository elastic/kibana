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

const { run } = require('@kbn/dev-utils');
const del = require('del');
const execa = require('execa');

run(
  async ({ flags }) => {
    await del(Path.resolve(__dirname, '../target'));

    await execa(require.resolve('typescript/bin/tsc'), flags.watch ? ['--watch'] : [], {
      cwd: Path.resolve(__dirname, '..'),
      stdio: 'inherit',
    });
  },
  {
    flags: {
      boolean: ['watch'],
      help: `
        --watch           Watch files and rebuild on changes
      `,
    },
  }
);
