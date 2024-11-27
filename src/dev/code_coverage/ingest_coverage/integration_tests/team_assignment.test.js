/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import execa from 'execa';
import del from 'del';

const ROOT_DIR = resolve(__dirname, '../../../../..');
const MOCKS_DIR = resolve(__dirname, './mocks');

describe('Team Assignment', () => {
  const teamAssignmentsPath =
    'src/dev/code_coverage/ingest_coverage/team_assignment/team_assignments.txt';
  const mockCodeOwners = 'CODEOWNERS';
  const resolved = resolve(MOCKS_DIR, mockCodeOwners);

  beforeAll(async () => {
    const params = [
      'scripts/generate_team_assignments.js',
      '--src',
      resolved,
      '--dest',
      teamAssignmentsPath,
    ];
    await execa(process.execPath, params, { cwd: ROOT_DIR });
  });

  afterAll(() => {
    del.sync(teamAssignmentsPath);
  });

  describe(`when the codeowners file contains #CC#`, () => {
    it(`should strip the prefix and still drill down through the fs`, async () => {
      const { stdout } = await execa('grep', ['tre', teamAssignmentsPath], { cwd: ROOT_DIR });
      const lines = stdout.split('\n').filter((line) => !line.includes('/target'));
      expect(lines).toEqual([
        'src/dev/code_coverage/ingest_coverage/integration_tests/fixtures/test_plugin/server/index.ts kibana-tre',
        'src/dev/code_coverage/ingest_coverage/integration_tests/fixtures/test_plugin/server/plugin.ts kibana-tre',
      ]);
    });
  });
});
