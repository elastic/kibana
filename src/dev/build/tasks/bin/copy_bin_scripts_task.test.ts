/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { Build } from '../../lib';
import { getMockConfig } from '../../lib/__mocks__/get_config';
import { CLOUD_PLATFORMS, DOWNLOAD_PLATFORMS, SERVERLESS_PLATFORMS } from '../../lib/platform';
import { CopyBinScripts } from './copy_bin_scripts_task';

describe('bin/kibana Node selection', () => {
  const config = getMockConfig();
  const build = new Build(config);
  let directory: string;

  const writeExecutable = (path: string, contents: string) => {
    writeFileSync(path, `#!/bin/sh\n${contents}\n`, { mode: 0o755 });
  };

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'kibana-bin-test-'));
    mkdirSync(join(directory, 'commands'));
    writeExecutable(
      join(directory, 'commands', 'cat'),
      `case "$1" in
        /sys/fs/cgroup/memory.max)
          [ "$TEST_CGROUP_V2" = unavailable ] && exit 1
          printf '%s\\n' "$TEST_CGROUP_V2" ;;
        /sys/fs/cgroup/memory/memory.limit_in_bytes)
          printf '%s\\n' "$TEST_CGROUP_V1" ;;
        *) exec /bin/cat "$@" ;;
      esac`
    );
    writeExecutable(join(directory, 'commands', 'awk'), `printf '%s\\n' "$TEST_MEM_TOTAL_KB"`);
    for (const variant of ['default', 'glibc-217', 'pointer-compression']) {
      const nodeDirectory = join(directory, 'node', variant, 'bin');
      mkdirSync(nodeDirectory, { recursive: true });
      writeExecutable(
        join(nodeDirectory, 'node'),
        `[ "$1" = --version ] && exit 0\nprintf '%s\\n' '${variant}' "$NODE_OPTIONS"`
      );
    }
    jest.spyOn(build, 'resolvePathForPlatform').mockReturnValue(join(directory, 'bin'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    rmSync(directory, { recursive: true, force: true });
  });

  const runLauncher = async (
    env: NodeJS.ProcessEnv = {},
    platform = CLOUD_PLATFORMS[0],
    forcePointerCompression = false
  ) => {
    jest.spyOn(config, 'getTargetPlatforms').mockReturnValue([platform]);
    jest
      .spyOn(config, 'shouldForceNodePointerCompression')
      .mockReturnValue(forcePointerCompression);
    await CopyBinScripts.run(config, new ToolingLog(), build);
    const launcher = join(directory, 'bin', 'kibana');
    execFileSync('/bin/sh', ['-n', launcher]);
    return execFileSync('/bin/sh', [launcher], {
      encoding: 'utf8',
      env: {
        PATH: `${join(directory, 'commands')}:/usr/bin:/bin`,
        ELASTIC_CONTAINER: 'true',
        TEST_CGROUP_V2: '1073741824',
        TEST_MEM_TOTAL_KB: '8388608',
        ...env,
      },
    })
      .trim()
      .split('\n');
  };

  it.each(['536870912', '1073741823', '1073741824'])(
    'keeps default Node at %s bytes',
    async (memory) => {
      expect((await runLauncher({ TEST_CGROUP_V2: memory }))[0]).toBe('default');
    }
  );

  it.each(['1073741825', '2147483648', '0', '', 'invalid', 'max'])(
    'keeps default Node at %s bytes or with an invalid limit',
    async (memory) => {
      expect((await runLauncher({ TEST_CGROUP_V2: memory }))[0]).toBe('default');
    }
  );

  it('keeps default Node with a cgroup v1 limit', async () => {
    expect(
      (
        await runLauncher({
          TEST_CGROUP_V2: 'unavailable',
          TEST_CGROUP_V1: '1073741824',
        })
      )[0]
    ).toBe('default');
  });

  it.each(['max', '', 'invalid', '9223372036854771712'])(
    'keeps default Node with small host memory for a cgroup limit of %s',
    async (memory) => {
      expect(
        (
          await runLauncher({
            TEST_CGROUP_V2: memory,
            TEST_MEM_TOTAL_KB: '1048576',
          })
        )[0]
      ).toBe('default');
    }
  );

  it('keeps default Node when neither memory source is available', async () => {
    expect((await runLauncher({ TEST_CGROUP_V2: '', TEST_MEM_TOTAL_KB: '' }))[0]).toBe('default');
  });

  it('does not automatically select pointer compression outside containers', async () => {
    expect((await runLauncher({ ELASTIC_CONTAINER: '' }))[0]).toBe('default');
  });

  it('respects an explicit opt-out', async () => {
    expect((await runLauncher({ KBN_ENABLE_POINTER_COMPRESSION: 'false' }))[0]).toBe('default');
  });

  it('preserves an explicit opt-in', async () => {
    expect(
      (
        await runLauncher({
          KBN_ENABLE_POINTER_COMPRESSION: 'true',
          TEST_CGROUP_V2: '2147483648',
        })
      )[0]
    ).toBe('pointer-compression');
  });

  it.each([SERVERLESS_PLATFORMS[0], DOWNLOAD_PLATFORMS[0]])(
    'does not automatically select pointer compression for %s',
    async (platform) => {
      expect((await runLauncher({}, platform))[0]).toBe('default');
    }
  );

  it('preserves the serverless opt-in', async () => {
    expect(
      (
        await runLauncher(
          {
            KBN_ENABLE_POINTER_COMPRESSION: 'true',
          },
          SERVERLESS_PLATFORMS[0]
        )
      )[0]
    ).toBe('pointer-compression');
  });

  it('preserves forced pointer compression for CI', async () => {
    expect((await runLauncher({}, DOWNLOAD_PLATFORMS[0], true))[0]).toBe('pointer-compression');
  });

  it('ignores forced pointer compression on macOS', async () => {
    expect((await runLauncher({}, DOWNLOAD_PLATFORMS[2], true))[0]).toBe('default');
  });

  it('selects pointer compression with an explicit heap size', async () => {
    const [variant, options] = await runLauncher({
      KBN_ENABLE_POINTER_COMPRESSION: 'true',
      NODE_OPTIONS: '--max-old-space-size=600',
    });
    expect(variant).toBe('pointer-compression');
    expect(options.match(/--max-old-space-size=\d+/g)).toEqual(['--max-old-space-size=600']);
  });

  it.each([
    ['1073741824', '768'],
    ['2147483648', '1536'],
    ['8589934592', '4096'],
  ])('preserves automatic heap sizing at %s bytes', async (memory, heap) => {
    expect((await runLauncher({ TEST_CGROUP_V2: memory }))[1]).toContain(
      `--max-old-space-size=${heap}`
    );
  });

  it('preserves the minimum heap threshold', async () => {
    expect((await runLauncher({ TEST_CGROUP_V2: '536870912' }))[1]).not.toContain(
      '--max-old-space-size'
    );
  });
});
