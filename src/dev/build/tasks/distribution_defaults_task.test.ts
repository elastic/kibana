/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdtemp, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { parse } from 'yaml';
import { ToolingLog } from '@kbn/tooling-log';
import { Build } from '../lib/build';
import { getMockConfig } from '../lib/__mocks__/get_config';
import * as Defaults from '../lib/distribution_defaults';
import { CreateDistributionDefaults } from './create_distribution_defaults_task';

const config = getMockConfig();
const build = new Build(config);
let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'kibana-package-defaults-'));
  jest.spyOn(config, 'getTargetPlatforms').mockReturnValue([config.getPlatform('linux', 'x64')]);
  jest
    .spyOn(build, 'resolvePathForPlatform')
    .mockImplementation((_platform, ...paths) => join(root, ...paths));
});
afterEach(async () => {
  jest.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});
it('emits no defaults for existing distributions', async () => {
  await CreateDistributionDefaults.run(config, new ToolingLog(), build);
  await expect(readFile(join(root, 'config_defaults/kibana.yml'))).rejects.toMatchObject({
    code: 'ENOENT',
  });
});
it('writes configured defaults without changing user configuration', async () => {
  jest.spyOn(Defaults, 'getDistributionDefaults').mockReturnValue({
    kibana: { 'server.name': 'packaged' },
    nodeOptions: ['--trace-warnings'],
    nodeEnvironment: { KBN_TEST_PATH: 'data' },
  });
  await CreateDistributionDefaults.run(config, new ToolingLog(), build);
  expect(parse(await readFile(join(root, 'config_defaults/kibana.yml'), 'utf8'))).toEqual({
    'server.name': 'packaged',
  });
  expect(await readFile(join(root, 'config_defaults/node.options'), 'utf8')).toBe(
    '--trace-warnings\n'
  );
  expect(await readFile(join(root, 'config_defaults/node_env.sh'), 'utf8')).toBe(
    'export KBN_TEST_PATH="$KBN_DISTRIBUTION_ROOT/data"\n'
  );
  await expect(readFile(join(root, 'config/node.options'))).rejects.toMatchObject({
    code: 'ENOENT',
  });
});
