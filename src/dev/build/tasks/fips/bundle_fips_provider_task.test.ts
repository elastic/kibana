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
import { ToolingLog } from '@kbn/tooling-log';
import { Build, downloadToDisk, exec } from '../../lib';
import { getMockConfig } from '../../lib/__mocks__/get_config';
import { BundleFipsProvider } from './bundle_fips_provider_task';
import {
  OPENSSL_FIPS_BUILD_IMAGE,
  OPENSSL_FIPS_CERTIFICATE_URL,
  OPENSSL_FIPS_SECURITY_POLICY_URL,
  OPENSSL_FIPS_SOURCE_SHA256,
  OPENSSL_FIPS_SOURCE_URL,
  OPENSSL_FIPS_VERSION,
} from '../../lib/fips_config';

jest.mock('../../lib/exec', () => ({ exec: jest.fn() }));
jest.mock('../../lib/download', () => ({ downloadToDisk: jest.fn() }));

const config = getMockConfig();
const build = new Build(config);
const log = new ToolingLog();
const validModuleConfig = `[fips_sect]
activate = 1
conditional-errors = 1
security-checks = 1
tls1-prf-ems-check = 1
drbg-no-trunc-md = 1
module-mac = ${Array(32).fill('AB').join(':')}
`;
let temporaryDir: string;
let machine: number | undefined;
let moduleConfig: string;
let buildContexts: string[];

beforeEach(async () => {
  temporaryDir = await mkdtemp(join(tmpdir(), 'kibana-fips-bundle-test-'));
  machine = undefined;
  moduleConfig = validModuleConfig;
  buildContexts = [];
  jest
    .spyOn(config, 'getTargetPlatforms')
    .mockReturnValue([
      config.getPlatform('linux', 'x64'),
      config.getPlatform('linux', 'x64', 'serverless'),
      config.getPlatform('linux', 'x64', 'cloud'),
      config.getPlatform('linux', 'arm64'),
      config.getPlatform('darwin', 'arm64'),
      config.getPlatform('win32', 'x64'),
    ]);
  jest
    .spyOn(build, 'resolvePathForPlatform')
    .mockImplementation((platform, ...paths) => join(temporaryDir, platform.toString(), ...paths));
  jest.mocked(downloadToDisk).mockImplementation(async ({ destination }) => {
    await writeFile(destination, 'source archive');
  });
  jest.mocked(exec).mockImplementation(async (_log, command, args, options) => {
    expect(command).toBe('docker');
    const output = args[args.indexOf('--output') + 1];
    const destination = output.slice('type=local,dest='.length);
    const dockerPlatform = args[args.indexOf('--platform') + 1];
    if (options?.cwd) buildContexts.push(options.cwd);
    await mkdir(join(destination, 'modules'), { recursive: true });
    await mkdir(join(destination, 'config'), { recursive: true });
    const module = Buffer.alloc(24);
    module.write('7f454c46', 'hex');
    module[4] = 2;
    module[5] = 1;
    module.writeUInt16LE(machine ?? (dockerPlatform === 'linux/arm64' ? 183 : 62), 18);
    await writeFile(join(destination, 'modules/fips.so'), module);
    await writeFile(join(destination, 'config/fipsmodule.cnf'), moduleConfig);
    await writeFile(join(destination, 'LICENSE.txt'), 'upstream Apache license');
    await writeFile(join(destination, 'build_info.txt'), 'OpenSSL 3.1.2 build information');
  });
});

afterEach(async () => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  await rm(temporaryDir, { recursive: true, force: true });
});

it('does not download or build a provider when only macOS, Windows, cloud, or serverless platforms are selected', async () => {
  jest
    .spyOn(config, 'getTargetPlatforms')
    .mockReturnValue([
      config.getPlatform('darwin', 'x64'),
      config.getPlatform('win32', 'x64'),
      config.getPlatform('linux', 'x64', 'serverless'),
      config.getPlatform('linux', 'x64', 'cloud'),
    ]);
  await BundleFipsProvider.run(config, log, build);
  expect(exec).not.toHaveBeenCalled();
  expect(downloadToDisk).not.toHaveBeenCalled();
});

it('builds both architectures from verified upstream sources and bundles provenance only in standard Linux distributions', async () => {
  await BundleFipsProvider.run(config, log, build);
  expect(downloadToDisk).toHaveBeenCalledTimes(1);
  expect(downloadToDisk).toHaveBeenCalledWith({
    log,
    url: OPENSSL_FIPS_SOURCE_URL,
    destination: expect.stringMatching(/openssl\.tar\.gz$/),
    shaChecksum: OPENSSL_FIPS_SOURCE_SHA256,
    shaAlgorithm: 'sha256',
    maxAttempts: 3,
  });
  for (const { architecture, dockerArchitecture, machineId } of [
    { architecture: 'x64', dockerArchitecture: 'amd64', machineId: 62 },
    { architecture: 'arm64', dockerArchitecture: 'arm64', machineId: 183 },
  ]) {
    const fipsRoot = join(temporaryDir, `linux-${architecture}/node/fips`);
    const module = await readFile(join(fipsRoot, 'modules/fips.so'));
    const moduleSha512 = createHash('sha512').update(module).digest('hex');
    expect(module.readUInt16LE(18)).toBe(machineId);
    expect(exec).toHaveBeenCalledWith(
      log,
      'docker',
      expect.arrayContaining([
        'buildx',
        'build',
        '--platform',
        `linux/${dockerArchitecture}`,
        `BUILD_IMAGE=${OPENSSL_FIPS_BUILD_IMAGE}`,
        `OPENSSL_VERSION=${OPENSSL_FIPS_VERSION}`,
        `OPENSSL_SHA256=${OPENSSL_FIPS_SOURCE_SHA256}`,
      ]),
      { cwd: buildContexts[0] }
    );
    expect(await readFile(join(fipsRoot, 'config/fipsmodule.cnf'), 'utf8')).toBe(validModuleConfig);
    const nodeConfig = await readFile(join(fipsRoot, 'config/nodejs.cnf'), 'utf8');
    expect(nodeConfig).toContain('default_properties = fips=yes');
    expect(nodeConfig).not.toContain('JITTER');
    expect(await readFile(join(fipsRoot, 'LICENSE.txt'), 'utf8')).toBe('upstream Apache license');
    expect(JSON.parse(await readFile(join(fipsRoot, 'manifest.json'), 'utf8'))).toEqual({
      sourceUrl: OPENSSL_FIPS_SOURCE_URL,
      sourceSha256: OPENSSL_FIPS_SOURCE_SHA256,
      version: OPENSSL_FIPS_VERSION,
      buildImage: OPENSSL_FIPS_BUILD_IMAGE,
      architecture: `linux/${dockerArchitecture}`,
      certificateUrl: OPENSSL_FIPS_CERTIFICATE_URL,
      securityPolicyUrl: OPENSSL_FIPS_SECURITY_POLICY_URL,
      selfTests: 'onload',
      moduleSha512,
      configSha512: createHash('sha512').update(validModuleConfig).digest('hex'),
      buildInfoSha512: createHash('sha512').update('OpenSSL 3.1.2 build information').digest('hex'),
    });
    expect(JSON.parse(await readFile(join(fipsRoot, 'sbom.spdx.json'), 'utf8'))).toMatchObject({
      spdxVersion: 'SPDX-2.3',
      packages: [
        {
          name: 'OpenSSL FIPS Provider',
          versionInfo: OPENSSL_FIPS_VERSION,
          licenseDeclared: 'Apache-2.0',
          checksums: [{ algorithm: 'SHA512', checksumValue: moduleSha512 }],
        },
      ],
    });
  }
  for (const platform of ['linux-x64-serverless', 'linux-x64-cloud', 'darwin-arm64', 'win32-x64']) {
    await expect(
      readFile(join(temporaryDir, platform, 'node/fips/modules/fips.so'))
    ).rejects.toMatchObject({
      code: 'ENOENT',
    });
  }
  expect(exec).toHaveBeenCalledTimes(2);
  await expect(readFile(join(buildContexts[0], 'openssl.tar.gz'))).rejects.toMatchObject({
    code: 'ENOENT',
  });
});

it.each([
  { architecture: 'x64' as const, dockerArchitecture: 'amd64', wrongMachine: 183 },
  { architecture: 'arm64' as const, dockerArchitecture: 'arm64', wrongMachine: 62 },
])(
  'rejects a provider for the wrong architecture in $architecture',
  async ({ architecture, dockerArchitecture, wrongMachine }) => {
    jest
      .spyOn(config, 'getTargetPlatforms')
      .mockReturnValue([config.getPlatform('linux', architecture)]);
    machine = wrongMachine;
    await expect(BundleFipsProvider.run(config, log, build)).rejects.toThrow(
      `does not match linux/${dockerArchitecture}`
    );
    await expect(
      readFile(join(temporaryDir, `linux-${architecture}/node/fips/modules/fips.so`))
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(join(buildContexts[0], 'openssl.tar.gz'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  }
);

it.each(['install-status', 'install-mac'])(
  'rejects cached self-test information (%s)',
  async (setting) => {
    moduleConfig += `${setting} = cached\n`;
    await expect(BundleFipsProvider.run(config, log, build)).rejects.toThrow(
      'must run self-tests on every load'
    );
  }
);

it.each([
  'activate',
  'security-checks',
  'conditional-errors',
  'tls1-prf-ems-check',
  'drbg-no-trunc-md',
])('rejects configuration that disables %s', async (setting) => {
  moduleConfig = moduleConfig.replace(`${setting} = 1`, `${setting} = 0`);
  await expect(BundleFipsProvider.run(config, log, build)).rejects.toThrow(
    `must enable ${setting}`
  );
});

it('rejects missing module integrity data', async () => {
  moduleConfig = moduleConfig.replace(/^module-mac.*$/m, '');
  await expect(BundleFipsProvider.run(config, log, build)).rejects.toThrow('missing module-mac');
});

it('does not build or bundle a provider when source verification fails', async () => {
  jest.mocked(downloadToDisk).mockRejectedValue(new Error('source checksum mismatch'));
  await expect(BundleFipsProvider.run(config, log, build)).rejects.toThrow(
    'source checksum mismatch'
  );
  expect(exec).not.toHaveBeenCalled();
  const [options] = jest.mocked(downloadToDisk).mock.calls[0];
  await expect(readFile(options.destination)).rejects.toMatchObject({ code: 'ENOENT' });
});

it('fails the release and removes the build context when a provider build fails', async () => {
  jest.mocked(exec).mockImplementationOnce(async (_log, _command, _args, options) => {
    if (options?.cwd) buildContexts.push(options.cwd);
    throw new Error('OpenSSL build failed');
  });
  await expect(BundleFipsProvider.run(config, log, build)).rejects.toThrow('OpenSSL build failed');
  await expect(
    readFile(join(temporaryDir, 'linux-x64/node/fips/modules/fips.so'))
  ).rejects.toMatchObject({ code: 'ENOENT' });
  await expect(readFile(join(buildContexts[0], 'openssl.tar.gz'))).rejects.toMatchObject({
    code: 'ENOENT',
  });
});
