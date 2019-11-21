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

import { run } from '@kbn/dev-utils';
import { REPO_ROOT } from '../constants';
import { buildSass } from './build_sass';

run(
  async ({ log, flags: { kibanaDir, watch } }) => {
    await buildSass({
      log,
      kibanaDir,
      watch,
    });
  },
  {
    description: 'Simple CLI, useful for building scss files outside of the server',
    flags: {
      default: {
        kibanaDir: REPO_ROOT,
        watch: false,
      },
      string: ['kibanaDir'],
      boolean: ['watch'],
      help: `
      --kibanaDir        The root of the Kibana directory to build sass files in.
      --watch            Watch the SASS files and recompile them on save.
    `,
    },
  }
);
