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

import Mocha from 'mocha';

import { loadTestFiles } from './load_test_files';
import { filterSuitesByTags } from './filter_suites_by_tags';
import { MochaReporterProvider } from './reporter';

/**
 *  Instantiate mocha and load testfiles into it
 *
 *  @param  {Lifecycle} lifecycle
 *  @param  {ToolingLog} log
 *  @param  {Config} config
 *  @param  {ProviderCollection} providers
 *  @return {Promise<Mocha>}
 */
export async function setupMocha(lifecycle, log, config, providers) {
  // configure mocha
  const mocha = new Mocha({
    ...config.get('mochaOpts'),
    reporter: await providers.loadExternalService(
      'mocha reporter',
      MochaReporterProvider
    )
  });

  // global beforeEach hook in root suite triggers before all others
  mocha.suite.beforeEach('global before each', async function () {
    await lifecycle.trigger('beforeEachTest', this.currentTest);
  });

  loadTestFiles({
    mocha,
    log,
    lifecycle,
    providers,
    paths: config.get('testFiles'),
    excludePaths: config.get('excludeTestFiles'),
    updateBaselines: config.get('updateBaselines'),
  });

  filterSuitesByTags({
    log,
    mocha,
    include: config.get('suiteTags.include'),
    exclude: config.get('suiteTags.exclude'),
  });

  return mocha;
}
