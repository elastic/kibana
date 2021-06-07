/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Mocha from 'mocha';
import { relative } from 'path';
import { REPO_ROOT } from '@kbn/utils';

import { loadTestFiles } from './load_test_files';
import { filterSuitesByTags } from './filter_suites_by_tags';
import { MochaReporterProvider } from './reporter';
import { validateCiGroupTags } from './validate_ci_group_tags';

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
    reporter: await providers.loadExternalService('mocha reporter', MochaReporterProvider),
  });

  // global beforeEach hook in root suite triggers before all others
  mocha.suite.beforeEach('global before each', async function () {
    await lifecycle.beforeEachTest.trigger(this.currentTest);
  });

  loadTestFiles({
    mocha,
    log,
    config,
    lifecycle,
    providers,
    paths: config.get('testFiles'),
    updateBaselines: config.get('updateBaselines'),
    updateSnapshots: config.get('updateSnapshots'),
  });

  // valiate that there aren't any tests in multiple ciGroups
  validateCiGroupTags(log, mocha);

  // Each suite has a tag that is the path relative to the root of the repo
  // So we just need to take input paths, make them relative to the root, and use them as tags
  // Also, this is a separate filterSuitesByTags() call so that the test suites will be filtered first by
  //  files, then by tags. This way, you can target tags (like smoke) in a specific file.
  filterSuitesByTags({
    log,
    mocha,
    include: config.get('suiteFiles.include').map((file) => relative(REPO_ROOT, file)),
    exclude: config.get('suiteFiles.exclude').map((file) => relative(REPO_ROOT, file)),
  });

  filterSuitesByTags({
    log,
    mocha,
    include: config.get('suiteTags.include').map((tag) => tag.replace(/-\d+$/, '')),
    exclude: config.get('suiteTags.exclude').map((tag) => tag.replace(/-\d+$/, '')),
  });

  return mocha;
}
