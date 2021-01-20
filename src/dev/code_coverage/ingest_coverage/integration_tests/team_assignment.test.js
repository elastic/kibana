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
    shell.rm(teamAssignmentsPath);
  });

  describe(`when the codeowners file contains #CC#`, () => {
    it(`should strip the prefix and still drill down through the fs`, async () => {
      const { stdout } = await execa('grep', ['tre', teamAssignmentsPath], { cwd: ROOT_DIR });
      expect(stdout).to.be(`x-pack/plugins/code/jest.config.js kibana-tre
x-pack/plugins/code/server/config.ts kibana-tre
x-pack/plugins/code/server/index.ts kibana-tre
x-pack/plugins/code/server/plugin.test.ts kibana-tre
x-pack/plugins/code/server/plugin.ts kibana-tre`);
    });
  });
});
