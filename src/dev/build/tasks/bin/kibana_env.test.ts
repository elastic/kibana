/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import execa from 'execa';
import { ToolingLog } from '@kbn/tooling-log';
import { Build } from '../../lib/build';
import { getMockConfig } from '../../lib/__mocks__/get_config';
import { CopyBinScripts } from './copy_bin_scripts_task';

const launchers = [
  'kibana',
  'kibana-keystore',
  'kibana-plugin',
  'kibana-encryption-keys',
  'kibana-setup',
  'kibana-verification-code',
  'kibana-health-gateway',
];

const getHeapLimit = async (nodeOptions: string): Promise<string> => {
  const { stdout } = await execa(
    process.execPath,
    ['-p', 'require("v8").getHeapStatistics().heap_size_limit'],
    { env: { NODE_OPTIONS: nodeOptions } }
  );
  return stdout;
};

const config = getMockConfig();
const build = new Build(config);
let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'kibana-launcher-env-'));
  jest.spyOn(config, 'getTargetPlatforms').mockReturnValue([config.getPlatform('linux', 'x64')]);
  jest
    .spyOn(build, 'resolvePathForPlatform')
    .mockImplementation((_platform, ...paths) => join(root, ...paths));
  await CopyBinScripts.run(config, new ToolingLog(), build);
  for (const variant of ['default', 'glibc-217']) {
    await mkdir(join(root, 'node', variant, 'bin'), { recursive: true });
    await writeFile(
      join(root, 'node', variant, 'bin/node'),
      '#!/bin/sh\nprintf "%s\\n" "$NODE_OPTIONS"\n',
      { mode: 0o755 }
    );
  }
});
afterEach(async () => {
  jest.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});
it.each(launchers)('preserves user option precedence in %s', async (launcher) => {
  const configDir = join(root, 'custom_config');
  await mkdir(configDir);
  await writeFile(join(configDir, 'node.options'), '# Comment\n--max-old-space-size=1024\n');
  const { stdout } = await execa(join(root, 'bin', launcher), [], {
    env: { KBN_PATH_CONF: configDir, NODE_OPTIONS: '--trace-warnings' },
  });
  expect(stdout).toContain('--max-old-space-size=1024');
  expect(stdout).toContain('--trace-warnings');
  expect(stdout.indexOf('--max-old-space-size=1024')).toBeLessThan(
    stdout.indexOf('--trace-warnings')
  );
});
it('retains inherited options when no user options file exists', async () => {
  const { stdout } = await execa(join(root, 'bin/kibana-keystore'), [], {
    env: {
      KBN_PATH_CONF: join(root, 'missing_config'),
      KBN_NODE_OPTS: '--max-old-space-size=1024',
      NODE_OPTIONS: '--trace-warnings',
    },
  });
  expect(stdout.trim()).toBe('--max-old-space-size=1024 --trace-warnings');
});

it.each(launchers)('lets user node.options override package defaults in %s', async (launcher) => {
  await mkdir(join(root, 'config_defaults'));
  await writeFile(join(root, 'config_defaults/node.options'), '--max-old-space-size=4096\n');
  const configDir = join(root, 'custom_config');
  await mkdir(configDir);
  await writeFile(join(configDir, 'node.options'), '--max-old-space-size=1024\n');
  const { stdout } = await execa(join(root, 'bin', launcher), [], {
    env: { KBN_PATH_CONF: configDir, NODE_OPTIONS: '--trace-warnings' },
  });
  expect(stdout.indexOf('--max-old-space-size=4096')).toBeGreaterThanOrEqual(0);
  expect(stdout.indexOf('--max-old-space-size=4096')).toBeLessThan(
    stdout.indexOf('--max-old-space-size=1024')
  );
  expect(stdout.indexOf('--max-old-space-size=1024')).toBeLessThan(
    stdout.indexOf('--trace-warnings')
  );
  expect(await getHeapLimit(stdout.trim())).toBe(await getHeapLimit('--max-old-space-size=1024'));
});

it('keeps inherited NODE_OPTIONS above package defaults and user node.options', async () => {
  await mkdir(join(root, 'config_defaults'));
  await writeFile(join(root, 'config_defaults/node.options'), '--max-old-space-size=4096\n');
  const configDir = join(root, 'custom_config');
  await mkdir(configDir);
  await writeFile(join(configDir, 'node.options'), '--max-old-space-size=1024\n');
  const { stdout } = await execa(join(root, 'bin/kibana-keystore'), [], {
    env: { KBN_PATH_CONF: configDir, NODE_OPTIONS: '--max-old-space-size=2048' },
  });
  expect(stdout.trim()).toBe(
    '--max-old-space-size=4096 --max-old-space-size=1024 --max-old-space-size=2048'
  );
  expect(await getHeapLimit(stdout.trim())).toBe(await getHeapLimit('--max-old-space-size=2048'));
});

it('prepends defaults to inherited KBN_NODE_OPTS when no user options file exists', async () => {
  await mkdir(join(root, 'config_defaults'));
  await writeFile(join(root, 'config_defaults/node.options'), '--max-old-space-size=4096\n');
  const { stdout } = await execa(join(root, 'bin/kibana-keystore'), [], {
    env: {
      KBN_PATH_CONF: join(root, 'missing_config'),
      KBN_NODE_OPTS: '--max-old-space-size=1024',
      NODE_OPTIONS: '--trace-warnings',
    },
  });
  expect(stdout.trim()).toBe(
    '--max-old-space-size=4096 --max-old-space-size=1024 --trace-warnings'
  );
});
