/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* tslint:disable */

import fs from 'fs';
import yaml from 'js-yaml';
import { TestConfig, RequestType } from '../../model/test_config';
import { TestRepoManager } from './test_repo_manager';
import { LspTestRunner } from './lsp_test_runner';

jest.setTimeout(30000);

const config: TestConfig = yaml.safeLoad(fs.readFileSync('test_config.yml', 'utf8'));
const repoManger: TestRepoManager = new TestRepoManager(config);

beforeAll(async (done) => {
  await repoManger.importAllRepos();
  done()
})

it('test Java lsp full', async () => {
  const repo = repoManger.getRepo('java');
  const runner = new LspTestRunner(repo);
  await runner.sendRandomRequest(RequestType.FULL);
  runner.proxy.exit();
})

it('test ts lsp full', async () => {
  const repo = repoManger.getRepo('ts');
  const runner = new LspTestRunner(repo);
  await runner.sendRandomRequest(RequestType.FULL);
  runner.proxy.exit();
})

afterAll(async (done) => {
  await repoManger.cleanAllRepos();
  done()
})
