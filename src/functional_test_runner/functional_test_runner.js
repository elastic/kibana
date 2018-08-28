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

import {
  createLifecycle,
  readConfigFile,
  createProviderCollection,
  setupMocha,
  runTests,
} from './lib';

export function createFunctionalTestRunner({ log, configFile, configOverrides }) {
  const lifecycle = createLifecycle();

  lifecycle.on('phaseStart', name => {
    log.verbose('starting %j lifecycle phase', name);
  });

  lifecycle.on('phaseEnd', name => {
    log.verbose('ending %j lifecycle phase', name);
  });

  class FunctionalTestRunner {
    async run() {
      let runErrorOccurred = false;

      try {
        const config = await readConfigFile(log, configFile, configOverrides);
        log.info('Config loaded');

        if (config.get('testFiles').length === 0) {
          log.warning('No test files defined.');
          return;
        }

        const providers = createProviderCollection(lifecycle, log, config);
        await providers.loadAll();

        const mocha = await setupMocha(lifecycle, log, config, providers);
        await lifecycle.trigger('beforeTests');
        log.info('Starting tests');
        return await runTests(lifecycle, log, mocha);

      } catch (runError) {
        runErrorOccurred = true;
        throw runError;

      } finally {
        try {
          await this.close();

        } catch (closeError) {
          if (runErrorOccurred) {
            log.error('failed to close functional_test_runner');
            log.error(closeError);
          } else {
            throw closeError;
          }
        }
      }
    }

    async close() {
      if (this._closed) return;

      this._closed = true;
      await lifecycle.trigger('cleanup');
    }
  }

  return new FunctionalTestRunner();
}
