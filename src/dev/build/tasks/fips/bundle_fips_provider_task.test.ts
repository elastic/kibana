/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { createHash } from 'crypto';
import execa from 'execa';
import { ToolingLog } from '@kbn/tooling-log';
import { Build, exec } from '../../lib';
import { getMockConfig } from '../../lib/__mocks__/get_config';
import { BundleFipsProvider } from './bundle_fips_provider_task';
import { FIPS_BASE_IMAGE } from '../../lib/fips_config';

jest.mock('../../lib/exec', () => ({ exec: jest.fn() }));
jest.mock('execa', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({
    stdout: JSON.stringify({
      manifests: [
        { digest: `sha256:${'a'.repeat(64)}`, platform: { os: 'linux', architecture: 'amd64' } },
      ],
    }),
  }),
}));

const config = getMockConfig();
const build = new Build(config);
const log = new ToolingLog();
const moduleConfig = '[fips_sect]\nactivate = 1\nmodule-mac = 00:01\n';
let temporaryDir: string;
let machine: number;

beforeEach(async () => {
  temporaryDir = await mkdtemp(join(tmpdir(), 'kibana-fips-bundle-test-'));
  machine = 62;
  jest
    .spyOn(config, 'getTargetPlatforms')
    .mockReturnValue([
      config.getPlatform('linux', 'x64'),
      config.getPlatform('linux', 'x64', 'fips'),
    ]);
  jest
    .spyOn(build, 'resolvePathForPlatform')
    .mockImplementation((platform, ...paths) => join(temporaryDir, platform.toString(), ...paths));
  jest.mocked(exec).mockImplementation(async (_log, command, args) => {
    expect(command).toBe('docker');
    if (args[0] !== 'cp') return;
    const [, source, destination] = args;
    if (source.endsWith('/fips.so')) {
      const module = Buffer.alloc(24);
      module.write('7f454c46', 'hex');
      module.writeUInt16LE(machine, 18);
      await writeFile(destination, module);
    } else if (source.endsWith('/fipsmodule.cnf')) {
      await writeFile(destination, moduleConfig);
    } else {
      await mkdir(destination);
      for (const name of [
        'openssl-provider-fips-3.4.0-3.4.0-r5',
        'NIST-CMVP-5132-1-r2',
        'NIST-ESV-191-1-r2',
        'unrelated-package',
      ]) {
        await writeFile(join(destination, `${name}.spdx.json`), '{}');
      }
    }
  });
});

afterEach(async () => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  await rm(temporaryDir, { recursive: true, force: true });
});

it('does not acquire a provider when no FIPS platforms are selected', async () => {
  jest.spyOn(config, 'getTargetPlatforms').mockReturnValue([config.getPlatform('linux', 'x64')]);
  await BundleFipsProvider.run(config, log, build);
  expect(exec).not.toHaveBeenCalled();
  expect(execa).not.toHaveBeenCalled();
});

it('preserves the provider and integrity configuration and records pinned provenance only in the FIPS distribution', async () => {
  await BundleFipsProvider.run(config, log, build);
  const regularRoot = join(temporaryDir, 'linux-x64/node/fips');
  const fipsRoot = join(temporaryDir, 'linux-x64-fips/node/fips');
  const module = await readFile(join(fipsRoot, 'modules/fips.so'));
  await expect(readFile(join(regularRoot, 'modules/fips.so'))).rejects.toMatchObject({
    code: 'ENOENT',
  });
  expect(await readFile(join(fipsRoot, 'config/fipsmodule.cnf'), 'utf8')).toBe(moduleConfig);
  expect(JSON.parse(await readFile(join(fipsRoot, 'manifest.json'), 'utf8'))).toEqual({
    sourceImage: FIPS_BASE_IMAGE,
    platformImage: `${FIPS_BASE_IMAGE.split('@')[0]}@sha256:${'a'.repeat(64)}`,
    architecture: 'linux/amd64',
    moduleSha512: createHash('sha512').update(module).digest('hex'),
    configSha512: createHash('sha512').update(moduleConfig).digest('hex'),
    sbomFiles: [
      'NIST-CMVP-5132-1-r2.spdx.json',
      'NIST-ESV-191-1-r2.spdx.json',
      'openssl-provider-fips-3.4.0-3.4.0-r5.spdx.json',
    ],
  });
  expect(jest.mocked(exec).mock.calls.some(([, , args]) => args[0] === 'rm')).toBe(true);
});

it('rejects a provider for the wrong architecture before copying it into a distribution', async () => {
  machine = 183;
  await expect(BundleFipsProvider.run(config, log, build)).rejects.toThrow(
    'does not match linux/amd64'
  );
  await expect(
    readFile(join(temporaryDir, 'linux-x64-fips/node/fips/modules/fips.so'))
  ).rejects.toMatchObject({ code: 'ENOENT' });
  expect(jest.mocked(exec).mock.calls.some(([, , args]) => args[0] === 'rm')).toBe(true);
});
