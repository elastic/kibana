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
import { withProcRunner, ToolingLog, REPO_ROOT } from '@kbn/dev-utils';
import { readConfigFile, runElasticsearch, runKibanaServer } from '@kbn/test';
import { navigateToKibana } from './tests/navigation';
// @ts-ignore not TS yet
import getUrl from '../../test_utils/get_url';

const configPath = resolve(REPO_ROOT, 'x-pack/test/functional/config.js');
const statsPath = resolve(REPO_ROOT, 'target/performance_stats');

export async function runTestsCli() {
  const log = new ToolingLog({
    level: 'debug',
    writeTo: process.stdout,
  });

  const opts = {
    log,
  };

  let results;

  await withProcRunner(log, async procs => {
    const config = await readConfigFile(log, configPath);

    const appConfig = {
      url: getUrl.baseUrl(config.get('servers.kibana')),
      login: config.get('servers.kibana.username'),
      password: config.get('servers.kibana.password'),
    };

    let es;
    try {
      es = await runElasticsearch({ config, options: opts });
      await runKibanaServer({ procs, config, options: opts });
      // run tests here
      results = await navigateToKibana(log, appConfig);
    } finally {
      try {
        await procs.stop('kibana');
      } finally {
        if (es) {
          await es.cleanup();
        }
      }
    }
  });

  Fs.mkdirSync(statsPath, { recursive: true });
  Fs.writeFileSync(resolve(statsPath, 'login_page.json'), JSON.stringify(results, null, 2));
}
