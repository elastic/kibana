/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { relative } from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
// @ts-expect-error we don't use @types/mocha so it doesn't conflict with @types/jest
import Mocha from 'mocha';

import { Suite } from '../../fake_mocha_types';
import { loadTests } from './load_tests';
import { filterSuites } from './filter_suites';
import { Lifecycle } from '../lifecycle';
import { Config } from '../config';
import { ProviderCollection } from '../providers';
import { EsVersion } from '../es_version';

import { MochaReporterProvider } from './reporter';
import { validateCiGroupTags } from './validate_ci_group_tags';

interface Options {
  lifecycle: Lifecycle;
  log: ToolingLog;
  config: Config;
  providers: ProviderCollection;
  esVersion: EsVersion;
  reporter?: any;
  reporterOptions?: any;
}

/**
 *  Instantiate mocha and load testfiles into it
 *  @return {Promise<Mocha>}
 */
export async function setupMocha({
  lifecycle,
  log,
  config,
  providers,
  esVersion,
  reporter,
  reporterOptions,
}: Options) {
  // configure mocha
  const mocha = new Mocha({
    ...config.get('mochaOpts'),
    reporter:
      reporter || (await providers.loadExternalService('mocha reporter', MochaReporterProvider)),
    reporterOptions,
  });

  // global beforeEach hook in root suite triggers before all others
  mocha.suite.beforeEach('global before each', async function (this: Suite) {
    await lifecycle.beforeEachTest.trigger(this.currentTest!);
  });

  loadTests({
    mocha,
    log,
    config,
    lifecycle,
    providers,
    updateBaselines: config.get('updateBaselines'),
    updateSnapshots: config.get('updateSnapshots'),
    paths: config.get('testFiles'),
  });

  // valiate that there aren't any tests in multiple ciGroups
  validateCiGroupTags(log, mocha);

  filterSuites({
    log,
    mocha,
    include: [],
    exclude: [],
    esVersion,
  });

  // Each suite has a tag that is the path relative to the root of the repo
  // So we just need to take input paths, make them relative to the root, and use them as tags
  // Also, this is a separate filterSuitesByTags() call so that the test suites will be filtered first by
  //  files, then by tags. This way, you can target tags (like smoke) in a specific file.
  filterSuites({
    log,
    mocha,
    include: config.get('suiteFiles.include').map((file: string) => relative(REPO_ROOT, file)),
    exclude: config.get('suiteFiles.exclude').map((file: string) => relative(REPO_ROOT, file)),
  });

  filterSuites({
    log,
    mocha,
    include: config.get('suiteTags.include').map((tag: string) => tag.replace(/-\d+$/, '')),
    exclude: config.get('suiteTags.exclude').map((tag: string) => tag.replace(/-\d+$/, '')),
  });

  return mocha;
}
