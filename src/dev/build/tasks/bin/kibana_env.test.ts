/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdtemp, mkdir, writeFile, rm, rename, symlink, readdir } from 'fs/promises';
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

describe.each(['x64', 'arm64'] as const)('Linux %s compatibility', (architecture) => {
  beforeEach(async () => {
    jest
      .spyOn(config, 'getTargetPlatforms')
      .mockReturnValue([config.getPlatform('linux', architecture)]);
    await CopyBinScripts.run(config, new ToolingLog(), build);
  });

  it.each(launchers)('uses glibc-217 when default Node cannot run in %s', async (launcher) => {
    await writeFile(
      join(root, 'node/default/bin/node'),
      '#!/bin/sh\nif [ "$1" = "--version" ]; then\n  exit 1\nfi\nprintf "%s\\n" "default" "$NODE_OPTIONS"\n'
    );
    await writeFile(
      join(root, 'node/glibc-217/bin/node'),
      '#!/bin/sh\nprintf "%s\\n" "glibc-217" "$NODE_OPTIONS" "$OPENSSL_CONF" "$OPENSSL_CONF_INCLUDE" "$OPENSSL_MODULES"\n'
    );

    const { stdout } = await execa(join(root, 'bin', launcher), [], {
      env: {
        NODE_OPTIONS: '--enable-fips --trace-warnings',
        OPENSSL_CONF: '',
        OPENSSL_CONF_INCLUDE: '',
        OPENSSL_MODULES: '',
      },
    });
    const [variant, nodeOptions, opensslConfig, configInclude, modules] = stdout.trim().split('\n');
    expect(variant).toBe('glibc-217');
    expect(nodeOptions).toContain('--enable-fips --trace-warnings');
    expect(opensslConfig).toBe(join(root, 'node/fips/config/nodejs.cnf'));
    expect(configInclude).toBe(join(root, 'node/fips/config'));
    expect(modules).toBe(join(root, 'node/fips/modules'));
  });

  it.each(launchers)('exports package environment before invoking Node in %s', async (launcher) => {
    await mkdir(join(root, 'config_defaults'));
    await writeFile(
      join(root, 'config_defaults/node_env.sh'),
      'export KBN_TEST_PATH="$KBN_DISTRIBUTION_ROOT/data"\n'
    );
    for (const variant of ['default', 'glibc-217']) {
      await writeFile(
        join(root, 'node', variant, 'bin/node'),
        '#!/bin/sh\nif [ "$1" = "--version" ]; then\n  test -n "$KBN_TEST_PATH"\n  exit "$?"\nfi\nprintf "%s\\n" "$0" "$KBN_TEST_PATH"\n'
      );
    }

    const { stdout } = await execa(join(root, 'bin', launcher), [], {
      env: { KBN_PATH_CONF: join(root, 'missing_config'), KBN_TEST_PATH: '' },
    });
    const [nodePath, environmentPath] = stdout.trim().split('\n');
    const expectedVariant = launcher === 'kibana-encryption-keys' ? 'glibc-217' : 'default';
    expect(nodePath).toContain(`/node/${expectedVariant}/bin/node`);
    expect(environmentPath).toBe(join(root, 'data'));
  });
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

it.each(launchers)(
  'loads the bundled provider in %s after relocation with a custom config directory',
  async (launcher) => {
    const relocatedRoot = `${root} relocated kibana`;
    await rename(root, relocatedRoot);
    root = relocatedRoot;
    for (const variant of ['default', 'glibc-217']) {
      await writeFile(
        join(root, 'node', variant, 'bin/node'),
        '#!/bin/sh\nprintf "%s\\n" "$NODE_OPTIONS" "$OPENSSL_CONF" "$OPENSSL_CONF_INCLUDE" "$OPENSSL_MODULES"\n',
        { mode: 0o755 }
      );
    }
    const configDir = join(root, 'custom config');
    await mkdir(configDir);
    await writeFile(join(configDir, 'node.options'), '--enable-fips\n--max-old-space-size=1024\n');
    const { stdout } = await execa(join(root, 'bin', launcher), [], {
      env: {
        KBN_PATH_CONF: configDir,
        NODE_OPTIONS: '--trace-warnings',
        OPENSSL_CONF: '',
        OPENSSL_CONF_INCLUDE: '',
        OPENSSL_MODULES: '',
      },
    });
    const [nodeOptions, opensslConfig, configInclude, modules] = stdout.split('\n');
    expect(nodeOptions).toContain('--enable-fips --max-old-space-size=1024 --trace-warnings');
    expect(opensslConfig).toBe(join(root, 'node/fips/config/nodejs.cnf'));
    expect(configInclude).toBe(join(root, 'node/fips/config'));
    expect(modules).toBe(join(root, 'node/fips/modules'));
  }
);

const getOpenSslEnvironment = async (
  nodeOptions: string,
  environment: Record<string, string> = {}
): Promise<string[]> => {
  const { stdout } = await execa(
    process.env.KBN_LAUNCHER_TEST_SHELL ?? '/bin/sh',
    [
      '-eu',
      '-c',
      '. "$DIR/bin/kibana_env"; printf "%s\\n" "$OPENSSL_CONF" "$OPENSSL_CONF_INCLUDE" "$OPENSSL_MODULES"',
    ],
    {
      env: {
        DIR: root,
        NODE_OPTIONS: nodeOptions,
        KBN_NODE_OPTS: '',
        OPENSSL_CONF: '',
        OPENSSL_CONF_INCLUDE: '',
        OPENSSL_MODULES: '',
        ...environment,
      },
    }
  );
  return stdout.split('\n');
};

it('selects the bundled provider without external commands on PATH', async () => {
  expect(
    await getOpenSslEnvironment("--require=/opt/O'Reilly/apm.js --enable-fips", { PATH: '' })
  ).toEqual([
    join(root, 'node/fips/config/nodejs.cnf'),
    join(root, 'node/fips/config'),
    join(root, 'node/fips/modules'),
  ]);
});

it.each([
  '--enable-fips',
  '--enable-fips=true',
  '--enable-fips=false',
  '--force-fips',
  '--force-fips=true',
  '--force-fips=false',
  '--enable_fips',
  '--force_fips',
  '"--enable-fips"',
  '--enable-fips --no-force-fips',
  '--force-fips --no-enable-fips',
  '--force-fips --no-force-fips --force-fips',
])('selects the bundled provider for inherited %s', async (flag) => {
  expect(await getOpenSslEnvironment(`--trace-warnings ${flag}`)).toEqual([
    join(root, 'node/fips/config/nodejs.cnf'),
    join(root, 'node/fips/config'),
    join(root, 'node/fips/modules'),
  ]);
});

it.each([
  "--require=/opt/O'Reilly/apm.js --enable-fips",
  String.raw`--require=/opt/trailing\ --enable-fips`,
  String.raw`--require="/opt/quoted\"/apm.js" --enable-fips`,
  String.raw`--require="/opt/backslash\\" --enable-fips`,
])('uses Node quoting rules for inherited options: %s', async (options) => {
  expect(await getOpenSslEnvironment(options)).toEqual([
    join(root, 'node/fips/config/nodejs.cnf'),
    join(root, 'node/fips/config'),
    join(root, 'node/fips/modules'),
  ]);
});

it.each([
  '',
  '--trace-warnings',
  '--enable-fips --no-enable-fips',
  '--enable-fips --no-enable-fips=true',
  '--enable-fips --no-enable-fips=false',
  '--force-fips --no-force-fips',
  '--force-fips --no-force-fips=true',
  '--force-fips --no-force-fips=false',
  '--enable-fips --force-fips --no-enable-fips --no-force-fips',
  '--force_fips --no_force-fips',
  '--enable-fips-extra',
  '--require "/a path containing --enable-fips text"',
  '--require "/a path containing\n--enable-fips\ntext"',
  '--require=/opt/path\t--enable-fips',
])('leaves the provider inactive for %s', async (options) => {
  expect(await getOpenSslEnvironment(options)).toEqual(['', '', '']);
});

it('lets inherited options disable FIPS requested in node.options', async () => {
  await mkdir(join(root, 'config'));
  await writeFile(join(root, 'config/node.options'), '--enable-fips\n');
  expect(await getOpenSslEnvironment('--no-enable-fips')).toEqual(['', '', '']);
});

it.each(['', '--enable-fips'])(
  'applies FIPS option precedence with inherited NODE_OPTIONS=%s',
  async (nodeOptions) => {
    await mkdir(join(root, 'config_defaults'));
    await writeFile(join(root, 'config_defaults/node.options'), '--enable-fips\n');
    const configDir = join(root, 'custom_config');
    await mkdir(configDir);
    await writeFile(join(configDir, 'node.options'), '--no-enable-fips\n');

    const environment = await getOpenSslEnvironment(nodeOptions, { KBN_PATH_CONF: configDir });
    expect(environment).toEqual(
      nodeOptions === '--enable-fips'
        ? [
            join(root, 'node/fips/config/nodejs.cnf'),
            join(root, 'node/fips/config'),
            join(root, 'node/fips/modules'),
          ]
        : ['', '', '']
    );
  }
);

it.each(['--enable-fips', '--force-fips'])(
  'leaves the OpenSSL environment unchanged on macOS with %s',
  async (nodeOptions) => {
    jest
      .spyOn(config, 'getTargetPlatforms')
      .mockReturnValue([config.getPlatform('darwin', 'arm64')]);
    await CopyBinScripts.run(config, new ToolingLog(), build);

    expect(await getOpenSslEnvironment(nodeOptions)).toEqual(['', '', '']);
  }
);

it('preserves the existing FIPS Docker provider configuration', async () => {
  const environment = {
    OPENSSL_CONF: '/usr/share/kibana/config/nodejs.cnf',
    OPENSSL_CONF_INCLUDE: '',
    OPENSSL_MODULES: '/usr/lib64/ossl-modules',
  };
  expect(await getOpenSslEnvironment('--enable-fips', environment)).toEqual([
    environment.OPENSSL_CONF,
    environment.OPENSSL_CONF_INCLUDE,
    environment.OPENSSL_MODULES,
  ]);
});

it.each(['OPENSSL_CONF', 'OPENSSL_CONF_INCLUDE', 'OPENSSL_MODULES'])(
  'preserves an explicitly supplied %s without mixing provider configurations',
  async (name) => {
    const environment = { OPENSSL_CONF: '', OPENSSL_CONF_INCLUDE: '', OPENSSL_MODULES: '' };
    environment[name as keyof typeof environment] = '/external provider';
    expect(await getOpenSslEnvironment('--enable-fips', environment)).toEqual([
      environment.OPENSSL_CONF,
      environment.OPENSSL_CONF_INCLUDE,
      environment.OPENSSL_MODULES,
    ]);
  }
);

it.each([
  '--openssl-config=/external/config.cnf',
  "--openssl-config=/external/O'Reilly.cnf",
  '--openssl-config "/external config.cnf"',
  '--openssl_config=/external/config.cnf',
  '"--openssl-config=/external config.cnf"',
])('preserves the explicit OpenSSL option %s', async (option) => {
  expect(await getOpenSslEnvironment(`--enable-fips ${option}`)).toEqual(['', '', '']);
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

it('writes diagnostics inside Kibana after relocation into a directory containing spaces', async () => {
  const relocatedRoot = `${root} relocated kibana`;
  await rename(root, relocatedRoot);
  root = relocatedRoot;
  await mkdir(join(root, 'data'));
  for (const variant of ['default', 'glibc-217']) {
    const nodePath = join(root, 'node', variant, 'bin/node');
    await rm(nodePath);
    await symlink(process.execPath, nodePath);
  }
  const cliDir = join(root, 'node_modules/@kbn/cli/kibana');
  await mkdir(cliDir, { recursive: true });
  await writeFile(
    join(cliDir, 'dist'),
    'process.kill(process.pid, "SIGUSR2"); setTimeout(() => console.log(process.versions.node), 100);\n'
  );
  const { stdout } = await execa(join(root, 'bin/kibana'), ['--version'], {
    cwd: root,
    env: { NODE_OPTIONS: '', NODE_OPTIONS_HEAPSNAPSHOT_DEFAULT: '' },
  });
  expect(stdout).toBe(process.versions.node);
  const diagnosticFiles = await readdir(join(root, 'data'));
  expect(diagnosticFiles.filter((name) => name.endsWith('.heapsnapshot'))).toHaveLength(1);
});
