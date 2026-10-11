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
  ['x64', 'fips'],
  ['arm64', 'fips'],
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

it.each(['x64', 'arm64'] as const)(
  'packages the %s FIPS staging tree with a distinct RPM identity',
  async (architecture) => {
    const platform = config.getPlatform('linux', architecture, 'fips');
    await runFpm(config, log, build, 'rpm', platform, ['--architecture', architecture]);
    const args = jest.mocked(exec).mock.calls[0][2];
    expect(args.slice(args.indexOf('--name'), args.indexOf('--name') + 2)).toEqual([
      '--name',
      'kibana-fips',
    ]);
    expect(args).toContain(config.resolveFromTarget('NAME-8.0.0-ARCH.TYPE'));
    expect(args).toContain(
      `${build.resolvePathForPlatform(
        config.getPlatform('linux', architecture, 'fips')
      )}/=/usr/share/kibana/`
    );
    expect(args.slice(args.indexOf('--conflicts'), args.indexOf('--conflicts') + 2)).toEqual([
      '--conflicts',
      'kibana',
    ]);
    expect(args).toContain('glibc >= 2.34');
    expect(args).toContain('usr/share/kibana/config');
    expect(args).not.toContain('usr/share/kibana/config_defaults');
  }
);

it('keeps the regular RPM name and prevents coexistence with the FIPS RPM', async () => {
  await runFpm(config, log, build, 'rpm', config.getPlatform('linux', 'x64'), []);
  const args = jest.mocked(exec).mock.calls[0][2];
  expect(args.slice(args.indexOf('--name'), args.indexOf('--name') + 2)).toEqual([
    '--name',
    'kibana',
  ]);
  expect(args.slice(args.indexOf('--conflicts'), args.indexOf('--conflicts') + 2)).toEqual([
    '--conflicts',
    'kibana-fips',
  ]);
  expect(args).not.toContain('glibc >= 2.34');
  expect(args).not.toContain('--depends');
});
