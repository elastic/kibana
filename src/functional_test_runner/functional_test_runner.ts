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

import { ToolingLog } from '@kbn/dev-utils';

import {
  createLifecycle,
  readConfigFile,
  ProviderCollection,
  readProviderSpec,
  loadTests,
  getFullName,
  runTests,
  Config,
} from './lib';

export class FunctionalTestRunner {
  public readonly lifecycle = createLifecycle();

  constructor(
    private readonly log: ToolingLog,
    private readonly configFile: string,
    private readonly configOverrides: any
  ) {
    this.lifecycle.on('phaseStart', name => {
      log.verbose('starting %j lifecycle phase', name);
    });

    this.lifecycle.on('phaseEnd', name => {
      log.verbose('ending %j lifecycle phase', name);
    });
  }

  async runTests() {
    return await this.exec(async (config, coreProviders) => {
      const providers = new ProviderCollection(this.log, [
        ...coreProviders,
        ...readProviderSpec('Service', config.get('services')),
        ...readProviderSpec('PageObject', config.get('pageObjects')),
      ]);

      await providers.loadAll();

      const suite = this.loadRootSuite(config, providers);
      this.log.info('Starting tests');
      return await runTests(this.log, suite, this.lifecycle);
    });
  }

  async getTestStats() {
    return await this.exec(async (config, coreProviders) => {
      // replace the function of custom service providers so that they return
      // promise-like objects which never resolve, essentially disabling them
      // allowing us to load the test files and populate the mocha suites
      const readStubbedProviderSpec = (type: string, providers: any) =>
        readProviderSpec(type, providers).map(p => ({
          ...p,
          fn: () => ({
            then: () => {},
          }),
        }));

      const providers = new ProviderCollection(this.log, [
        ...coreProviders,
        ...readStubbedProviderSpec('Service', config.get('services')),
        ...readStubbedProviderSpec('PageObject', config.get('pageObjects')),
      ]);

      const suite = this.loadRootSuite(config, providers);
      return {
        testCount: suite.countTests(),
        excludedTests: suite.getExcludedTests().map(test => getFullName(test)),
      };
    });
  }

  private loadRootSuite(config: Config, providers: ProviderCollection) {
    return loadTests({
      testFiles: config.get('testFiles'),
      log: this.log,
      providers,
      updateBaselines: config.get('updateBaselines'),
      excludePaths: config.get('excludeTestFiles'),
      includeTags: config.get('suiteTags.include'),
      excludeTags: config.get('suiteTags.exclude'),
      grep: config.get('runner.grep'),
      invertGrep: config.get('runner.invert'),
    });
  }

  private async exec<T = any>(
    handler: (config: Config, coreProvider: ReturnType<typeof readProviderSpec>) => Promise<T>
  ): Promise<T> {
    const config = await readConfigFile(this.log, this.configFile, this.configOverrides);
    this.log.info('Config loaded');

    if (config.get('testFiles').length === 0) {
      throw new Error('No test files defined.');
    }

    // base level services that functional_test_runner exposes
    const coreProviders = readProviderSpec('Service', {
      lifecycle: () => this.lifecycle,
      log: () => this.log,
      config: () => config,
    });

    return await handler(config, coreProviders);
  }
}
