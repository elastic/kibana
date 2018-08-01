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

import { relative, resolve } from 'path';
import * as Rx from 'rxjs';
import { startWith, switchMap, take } from 'rxjs/operators';
import { withProcRunner } from '@kbn/dev-utils';

import { runElasticsearch, runKibanaServer, runFtr, KIBANA_FTR_SCRIPT } from './lib';

import { readConfigFile } from '../../../../src/functional_test_runner/lib';

const SUCCESS_MESSAGE = `

Elasticsearch and Kibana are ready for functional testing. Start the functional tests
in another terminal session by running this command from this directory:

    node ${relative(process.cwd(), KIBANA_FTR_SCRIPT)}

`;

/**
 * Run servers and tests for each config
 * @param {object} options                   Optional
 * @property {string[]} configPaths          Array of paths to configs
 * @property {function} options.createLogger Optional logger creation function
 * @property {string} options.installDir     Optional installation dir from which to run Kibana
 * @property {boolean} options.bail          Whether to exit test run at the first failure
 * @property {string} options.esFrom         Optionally run from source instead of snapshot
 */
export async function runTests(options) {
  for (const configPath of options.configs) {
    await runSingleConfig(resolve(process.cwd(), configPath), options);
  }
}

/**
 * Start only servers using single config
 * @param {object} options                   Optional
 * @property {string} options.configPath     Path to a config file
 * @property {function} options.createLogger Optional logger creation function
 * @property {string} options.installDir     Optional installation dir from which to run Kibana
 * @property {string} options.esFrom         Optionally run from source instead of snapshot
 */
export async function startServers(options) {
  const { config: configOption, createLogger } = options;
  const configPath = resolve(process.cwd(), configOption);
  const log = createLogger();
  const opts = {
    ...options,
    log,
  };

  await withProcRunner(log, async procs => {
    const config = await readConfigFile(log, configPath);

    const es = await runElasticsearch({ config, options: opts });
    await runKibanaServer({
      procs,
      config,
      options: {
        ...opts,
        extraKbnOpts: [...options.extraKbnOpts, ...(options.installDir ? [] : ['--dev'])],
      },
    });

    // wait for 5 seconds of silence before logging the
    // success message so that it doesn't get buried
    await silence(5000, { log });
    log.info(SUCCESS_MESSAGE);

    await procs.waitForAllToStop();
    await es.cleanup();
  });
}

async function silence(milliseconds, { log }) {
  await Rx.fromEvent(log, 'data')
    .pipe(
      startWith(null),
      switchMap(() => Rx.timer(milliseconds)),
      take(1)
    )
    .toPromise();
}

/*
 * Start servers and run tests for single config
 */
async function runSingleConfig(configPath, options) {
  const log = options.createLogger();
  const opts = {
    ...options,
    log,
  };

  await withProcRunner(log, async procs => {
    const config = await readConfigFile(log, configPath);

    const es = await runElasticsearch({ config, options: opts });
    await runKibanaServer({ procs, config, options: opts });

    // Note: When solving how to incorporate functional_test_runner
    // clean this up
    await runFtr({
      procs,
      configPath,
      cwd: process.cwd(),
      options: opts,
    });

    await procs.stop('kibana');
    await es.cleanup();
  });
}
