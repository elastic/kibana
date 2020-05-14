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

import { resolve } from 'path';
import * as Fs from 'fs';
import { REPO_ROOT, run, createFlagError } from '@kbn/dev-utils';
import { readConfigFile } from '@kbn/test';
import { navigateToKibana } from './tests/navigation';
// @ts-ignore not TS yet
import getUrl from '../../test_utils/get_url';

const configPath = resolve(REPO_ROOT, 'x-pack/test/functional/config.js');
const statsPath = resolve(REPO_ROOT, 'target/performance_stats');

export function runTestsCli() {
  run(
    async ({ flags, log }) => {
      const config = await readConfigFile(log, configPath);

      const kibanaUrl = flags['kibana-url'];
      if (!kibanaUrl || typeof kibanaUrl !== 'string') {
        throw createFlagError('Expect --kibana-url to be a string');
      }

      const appConfig = {
        url: kibanaUrl,
        login: config.get('servers.kibana.username'),
        password: config.get('servers.kibana.password'),
      };

      const results = await navigateToKibana(log, appConfig);

      Fs.mkdirSync(statsPath, { recursive: true });
      Fs.writeFileSync(resolve(statsPath, 'login_page.json'), JSON.stringify(results, null, 2));
    },
    {
      flags: {
        string: ['kibana-url'],
        help: `
          --kibana-url       Url for Kibana we should connect to,
        `,
      },
    }
  );
}
