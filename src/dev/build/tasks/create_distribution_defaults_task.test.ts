/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdtemp, mkdir, writeFile, readFile, rm, rename } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import execa from 'execa';
import { parse } from 'yaml';
import { ToolingLog } from '@kbn/tooling-log';
import { Build } from '../lib/build';
import { getMockConfig } from '../lib/__mocks__/get_config';
import { CreateDistributionDefaults } from './create_distribution_defaults_task';
import { CopyBinScripts } from './bin/copy_bin_scripts_task';

const launchers = [
  'kibana',
  'kibana-keystore',
  'kibana-plugin',
  'kibana-encryption-keys',
  'kibana-setup',
  'kibana-verification-code',
  'kibana-health-gateway',
];

const config = getMockConfig();
const build = new Build(config);
const log = new ToolingLog();
let temporaryDir: string;

beforeEach(async () => {
  temporaryDir = await mkdtemp(join(tmpdir(), 'kibana-distribution-defaults-'));
  jest
    .spyOn(config, 'getTargetPlatforms')
    .mockReturnValue([
      config.getPlatform('linux', 'x64'),
      config.getPlatform('linux', 'x64', 'fips'),
    ]);
  jest
    .spyOn(build, 'resolvePathForPlatform')
    .mockImplementation((platform, ...paths) => join(temporaryDir, platform.toString(), ...paths));
  await CreateDistributionDefaults.run(config, log, build);
  await CopyBinScripts.run(config, log, build);
});

afterEach(async () => {
  jest.restoreAllMocks();
  await rm(temporaryDir, { recursive: true, force: true });
});

it('enables FIPS only in the FIPS distribution defaults', async () => {
  await expect(
    readFile(join(temporaryDir, 'linux-x64/config_defaults/kibana.yml'))
  ).rejects.toMatchObject({ code: 'ENOENT' });
  const fips = await readFile(
    join(temporaryDir, 'linux-x64-fips/config_defaults/kibana.yml'),
    'utf8'
  );
  expect(parse(fips)).toEqual({ 'xpack.security.fipsMode.enabled': true });
});

it.each(launchers)(
  'loads FIPS defaults for %s after relocation with a custom config directory',
  async (launcher) => {
    const originalRoot = join(temporaryDir, 'linux-x64-fips');
    const relocatedRoot = join(temporaryDir, 'relocated distribution');
    await rename(originalRoot, relocatedRoot);
    for (const variant of ['default', 'glibc-217']) {
      await mkdir(join(relocatedRoot, 'node', variant, 'bin'), { recursive: true });
      await writeFile(
        join(relocatedRoot, 'node', variant, 'bin/node'),
        `#!/bin/sh
printf '%s\n' "$NODE_OPTIONS" "$OPENSSL_CONF" "$OPENSSL_CONF_INCLUDE" "$OPENSSL_MODULES"
`,
        { mode: 0o755 }
      );
    }
    const customConfig = join(temporaryDir, 'custom config');
    await mkdir(customConfig);
    await writeFile(join(customConfig, 'node.options'), '--max-old-space-size=1024\n');

    const { stdout } = await execa(join(relocatedRoot, 'bin', launcher), [], {
      cwd: temporaryDir,
      env: { KBN_PATH_CONF: customConfig, NODE_OPTIONS: '--trace-warnings' },
    });
    const [nodeOptions, opensslConfig, configInclude, modules] = stdout.split('\n');
    expect(nodeOptions).toContain('--enable-fips');
    expect(nodeOptions).toContain('--max-old-space-size=1024');
    expect(nodeOptions).toContain('--trace-warnings');
    expect(nodeOptions.indexOf('--max-old-space-size=1024')).toBeLessThan(
      nodeOptions.indexOf('--enable-fips')
    );
    expect(nodeOptions.indexOf('--enable-fips')).toBeLessThan(
      nodeOptions.indexOf('--trace-warnings')
    );
    expect(opensslConfig).toBe(join(relocatedRoot, 'node/fips/config/nodejs.cnf'));
    expect(configInclude).toBe(join(relocatedRoot, 'node/fips/config'));
    expect(modules).toBe(join(relocatedRoot, 'node/fips/modules'));
  }
);

it('retains inherited options when the user config directory has no node.options', async () => {
  const root = join(temporaryDir, 'linux-x64-fips');
  const { stdout } = await execa(
    'sh',
    ['-eu', '-c', '. "$DIR/bin/kibana_env"; printf "%s\\n" "$NODE_OPTIONS" "$KBN_NODE_OPTS"'],
    {
      env: {
        DIR: root,
        KBN_PATH_CONF: join(temporaryDir, 'missing config'),
        NODE_OPTIONS: '--trace-warnings',
        KBN_NODE_OPTS: '--max-old-space-size=1024',
      },
    }
  );
  expect(stdout.split('\n')).toEqual([
    '--enable-fips --trace-warnings',
    '--max-old-space-size=1024',
  ]);
});
