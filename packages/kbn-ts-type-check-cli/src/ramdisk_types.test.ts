/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Os from 'os';
import Fsp from 'fs/promises';

jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/repo',
}));

jest.mock('@kbn/std', () => ({
  asyncForEachWithLimit: async (
    items: any[],
    _limit: number,
    iterator: (item: any) => Promise<void>
  ) => {
    for (const item of items) await iterator(item);
  },
}));

import { RAMDISK_ENV, resolveRamdiskMountPath } from './ramdisk_types';

const createLog = () =>
  ({
    info: jest.fn(),
    warning: jest.fn(),
    verbose: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
    write: jest.fn(),
    indent: jest.fn(),
  } as any);

describe('ramdisk_types', () => {
  let workspace: string;
  let mount: string;
  let repoRoot: string;
  const originalEnv = process.env[RAMDISK_ENV];

  beforeEach(async () => {
    workspace = await Fsp.mkdtemp(Path.join(Os.tmpdir(), 'kbn-ramdisk-test-'));
    mount = Path.join(workspace, 'mount');
    repoRoot = '/repo';
    await Fsp.mkdir(mount, { recursive: true });
    delete process.env[RAMDISK_ENV];

    // Re-jest.mock @kbn/repo-info per test isn't trivial; use a real on-disk fake repo
    // that lives under the workspace, then point REPO_ROOT to it.
    jest.resetModules();
    repoRoot = await Fsp.mkdtemp(Path.join(workspace, 'repo-'));
    jest.doMock('@kbn/repo-info', () => ({ REPO_ROOT: repoRoot }));
  });

  afterEach(async () => {
    if (originalEnv === undefined) delete process.env[RAMDISK_ENV];
    else process.env[RAMDISK_ENV] = originalEnv;
    await Fsp.rm(workspace, { recursive: true, force: true });
  });

  describe('resolveRamdiskMountPath', () => {
    it('returns undefined when env is unset', () => {
      expect(resolveRamdiskMountPath()).toBeUndefined();
    });

    it('accepts an absolute path from the flag', () => {
      expect(resolveRamdiskMountPath('/tmp/mount')).toBe('/tmp/mount');
    });

    it('returns the env value when set to a path', () => {
      process.env[RAMDISK_ENV] = '/tmp/from-env';
      expect(resolveRamdiskMountPath()).toBe('/tmp/from-env');
    });

    it('rejects boolean-style env values without an explicit path', () => {
      process.env[RAMDISK_ENV] = '1';
      expect(() => resolveRamdiskMountPath()).toThrow(/requires an explicit mount path/);
    });

    it('treats 0/false env values as disabled', () => {
      process.env[RAMDISK_ENV] = '0';
      expect(resolveRamdiskMountPath()).toBeUndefined();
      process.env[RAMDISK_ENV] = 'false';
      expect(resolveRamdiskMountPath()).toBeUndefined();
    });
  });

  describe('setupTypesRamdisk', () => {
    it('creates a symlink at <project>/target/types pointing into the mount tree', async () => {
      const { setupTypesRamdisk: setup } = await import('./ramdisk_types');
      const repoRelDir = 'packages/foo';
      await Fsp.mkdir(Path.join(repoRoot, repoRelDir), { recursive: true });
      const projects = [{ directory: Path.join(repoRoot, repoRelDir), repoRel: repoRelDir } as any];

      const session = await setup(createLog(), projects, mount);

      const linkPath = Path.join(repoRoot, repoRelDir, 'target', 'types');
      const stat = await Fsp.lstat(linkPath);
      expect(stat.isSymbolicLink()).toBe(true);
      const target = await Fsp.readlink(linkPath);
      expect(Path.resolve(Path.dirname(linkPath), target)).toBe(
        Path.join(mount, repoRelDir, 'target', 'types')
      );
      expect(session.linkedPaths.size).toBe(1);

      await session.unlink();
      await expect(Fsp.lstat(linkPath)).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it('moves existing target/types contents into the ramdisk mirror', async () => {
      const { setupTypesRamdisk: setup } = await import('./ramdisk_types');
      const repoRelDir = 'packages/bar';
      const realTypes = Path.join(repoRoot, repoRelDir, 'target', 'types');
      await Fsp.mkdir(realTypes, { recursive: true });
      await Fsp.writeFile(Path.join(realTypes, 'cached.d.ts'), 'export {};');

      const projects = [{ directory: Path.join(repoRoot, repoRelDir), repoRel: repoRelDir } as any];

      await setup(createLog(), projects, mount);

      const migrated = Path.join(mount, repoRelDir, 'target', 'types', 'cached.d.ts');
      expect(await Fsp.readFile(migrated, 'utf8')).toBe('export {};');
    });

    it('throws when the mount path does not exist or is not writable', async () => {
      const { setupTypesRamdisk: setup } = await import('./ramdisk_types');
      await expect(setup(createLog(), [], Path.join(workspace, 'missing'))).rejects.toThrow(
        /does not exist/
      );
    });
  });

  describe('purgeRamdiskMirror', () => {
    it('clears the mount tree but recreates the root directory', async () => {
      const { purgeRamdiskMirror: purge } = await import('./ramdisk_types');
      await Fsp.mkdir(Path.join(mount, 'packages/foo/target/types'), { recursive: true });
      await Fsp.writeFile(Path.join(mount, 'packages/foo/target/types/x.d.ts'), '');

      await purge(createLog(), mount);

      const entries = await Fsp.readdir(mount);
      expect(entries).toEqual([]);
    });
  });
});
