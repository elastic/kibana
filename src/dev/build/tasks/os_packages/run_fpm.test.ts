/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { Build, exec } from '../../lib';
import { getMockConfig } from '../../lib/__mocks__/get_config';
import { runFpm } from './run_fpm';
import { CreateRpmPackage } from './create_os_package_tasks';

jest.mock('../../lib/exec', () => ({ exec: jest.fn() }));

const config = getMockConfig();
const build = new Build(config);
const log = new ToolingLog();

beforeEach(() => jest.clearAllMocks());

it.each([
  ['x64', undefined],
  ['arm64', undefined],
] as const)('creates an RPM task for %s with variant %s', async (architecture, variant) => {
  const platform = config.getPlatform('linux', architecture, variant);
  await CreateRpmPackage(platform).run(config, log, build);
  const args = jest.mocked(exec).mock.calls[0][2];
  expect(args.slice(args.indexOf('--architecture'), args.indexOf('--architecture') + 2)).toEqual([
    '--architecture',
    architecture === 'x64' ? 'x86_64' : 'aarch64',
  ]);
  expect(args).toContain(`${build.resolvePathForPlatform(platform)}/=/usr/share/kibana/`);
});

it('preserves the regular RPM metadata', async () => {
  await runFpm(config, log, build, 'rpm', config.getPlatform('linux', 'x64'), []);
  const args = jest.mocked(exec).mock.calls[0][2];
  expect(args[args.indexOf('--name') + 1]).toBe('kibana');
  expect(args).not.toContain('--conflicts');
  expect(args).not.toContain('--depends');
});
