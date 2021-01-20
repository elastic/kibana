/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { resolve } from 'path';
import execa from 'execa';
import expect from '@kbn/expect';
import shell from 'shelljs';

const ROOT_DIR = resolve(__dirname, '../../../../..');
const MOCKS_DIR = resolve(__dirname, './mocks');
const env = {
  BUILD_ID: 407,
  CI_RUN_URL: 'https://kibana-ci.elastic.co/job/elastic+kibana+code-coverage/407/',
  STATIC_SITE_URL_BASE: 'https://kibana-coverage.elastic.dev',
  TIME_STAMP: '2020-03-02T21:11:47Z',
  ES_HOST: 'https://super:changeme@some.fake.host:9243',
  NODE_ENV: 'integration_test',
  COVERAGE_INGESTION_KIBANA_ROOT: '/var/lib/jenkins/workspace/elastic+kibana+code-coverage/kibana',
  FETCHED_PREVIOUS: 'FAKE_PREVIOUS_SHA',
};

describe('Ingesting coverage', () => {
  const teamAssignmentsPath =
    'src/dev/code_coverage/ingest_coverage/team_assignment/team_assignments.txt';

  const verboseArgs = [
    'scripts/ingest_coverage.js',
    '--verbose',
    '--teamAssignmentsPath',
    teamAssignmentsPath,
    '--vcsInfoPath',
    'src/dev/code_coverage/ingest_coverage/integration_tests/mocks/VCS_INFO.txt',
    '--path',
  ];

  const summaryPath = 'jest-combined/coverage-summary-manual-mix.json';
  const resolved = resolve(MOCKS_DIR, summaryPath);

  beforeAll(async () => {
    const params = [
      'scripts/generate_team_assignments.js',
      '--src',
      '.github/CODEOWNERS',
      '--dest',
      teamAssignmentsPath,
    ];
    await execa(process.execPath, params, { cwd: ROOT_DIR, env });
  });

  afterAll(() => {
    shell.rm(teamAssignmentsPath);
  });

  describe(`staticSiteUrl`, () => {
    let actualUrl = '';
    const siteUrlRegex = /"staticSiteUrl":\s*(.+,)/;

    beforeAll(async () => {
      const opts = [...verboseArgs, resolved];
      const { stdout } = await execa(process.execPath, opts, { cwd: ROOT_DIR, env });
      actualUrl = siteUrlRegex.exec(stdout)[1];
    });

    it('should contain the static host', () => {
      const staticHost = /https:\/\/kibana-coverage\.elastic\.dev/;
      expect(staticHost.test(actualUrl)).ok();
    });
    it('should contain the timestamp', () => {
      const timeStamp = /\d{4}-\d{2}-\d{2}T\d{2}.*\d{2}.*\d{2}Z/;
      expect(timeStamp.test(actualUrl)).ok();
    });
    it('should contain the folder structure', () => {
      const folderStructure = /(?:.*|.*-combined)\//;
      expect(folderStructure.test(actualUrl)).ok();
    });
  });
});
