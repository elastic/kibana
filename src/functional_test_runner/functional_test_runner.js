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
  ProviderCollection,
  readProviderSpec,
  setupMocha,
  runTests,
} from './lib';

// provider that returns a promise-like object which never "resolves" and is
// used to disable all the services while still allowing us to load the test
// files (and therefore define the tests) for assert-none-excluded
const STUB_PROVIDER =  () => ({
  then: () => {}
});

const replaceValues = (object, value) => Object.keys(object).reduce((acc, key) => ({
  ...acc,
  [key]: value
}), {});

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
      return await this._run(async (config) => {
        const providers = new ProviderCollection(log, [
          // base level services that functional_test_runner exposes
          ...readProviderSpec('Service', {
            lifecycle: () => lifecycle,
            log: () => log,
            config: () => config,
          }),

          ...readProviderSpec('Service', config.get('services')),
          ...readProviderSpec('PageObject', config.get('pageObjects'))
        ]);

        await providers.loadAll();

        const mocha = await setupMocha(lifecycle, log, config, providers);
        await lifecycle.trigger('beforeTests');
        log.info('Starting tests');

        return await runTests(lifecycle, log, mocha);
      });
    }

    async assertNoneExcluded() {
      return await this._run(async (config) => {
        const providers = new ProviderCollection(log, [
          // base level services that functional_test_runner exposes
          ...readProviderSpec('Service', {
            lifecycle: () => lifecycle,
            log: () => log,
            config: () => config,
          }),

          ...readProviderSpec('Service', replaceValues(config.get('services'), STUB_PROVIDER)),
          ...readProviderSpec('PageObject', replaceValues(config.get('pageObjects'), STUB_PROVIDER))
        ]);

        const { excludedTests } = await setupMocha(lifecycle, log, config, providers);

        if (excludedTests.length) {
          log.error(`${excludedTests.length} tests excluded by tags:\n  -${excludedTests.map(t => t.fullTitle()).join('\n  -')}`);
        } else {
          log.info('All tests included by tags');
        }

        return excludedTests.length;
      });
    }

    async close() {
      if (this._closed) {
        return;
      }

      this._closed = true;
      await lifecycle.trigger('cleanup');
    }

    async _run(handler) {
      let runErrorOccurred = false;

      try {
        const config = await readConfigFile(log, configFile, configOverrides);
        log.info('Config loaded');

        if (config.get('testFiles').length === 0) {
          log.warning('No test files defined.');
          return;
        }

        return await handler(config);
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
  }

  return new FunctionalTestRunner();
}
