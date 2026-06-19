/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fsp from 'fs/promises';
import { REPO_ROOT } from '@kbn/repo-info';
import { asyncForEachWithLimit } from '@kbn/std';
import type { ToolingLog } from '@kbn/tooling-log';
import type { TsProject } from '@kbn/ts-projects';

export const RAMDISK_ENV = 'KBN_TYPECHECK_RAMDISK';
const TARGET_TYPES = Path.join('target', 'types');

export interface RamdiskTypesSession {
  /** Absolute path to the ramdisk mount root that backs `target/types`. */
  readonly mountPath: string;
  /** Symlinks (in REPO_ROOT) created or claimed by this session. */
  readonly linkedPaths: ReadonlySet<string>;
  /** Removes the symlinks. Ramdisk contents are preserved for reuse. */
  unlink(): Promise<void>;
}

/**
 * Resolves the ramdisk mount path from `--ramdisk-types` flag or `KBN_TYPECHECK_RAMDISK`.
 * Returns `undefined` when ramdisk mode is disabled.
 */
export function resolveRamdiskMountPath(flagValue?: string | null): string | undefined {
  const fromFlag = flagValue?.trim();
  if (fromFlag) {
    return Path.resolve(fromFlag);
  }
  const fromEnv = process.env[RAMDISK_ENV]?.trim();
  if (!fromEnv || fromEnv === '0' || fromEnv.toLowerCase() === 'false') {
    return undefined;
  }
  // Allow `KBN_TYPECHECK_RAMDISK=1` only when a flag also supplies the path; otherwise
  // require an explicit path so we never write into a surprise location.
  if (fromEnv === '1' || fromEnv.toLowerCase() === 'true') {
    throw new Error(
      `${RAMDISK_ENV}=${fromEnv} requires an explicit mount path. Set ${RAMDISK_ENV}=/path/to/mount or pass --ramdisk-types <path>.`
    );
  }
  return Path.resolve(fromEnv);
}

/**
 * Replaces each project's `target/types` with a symlink into a parallel tree under
 * `mountPath`. Existing contents are moved into the ramdisk so cached artifacts are
 * preserved across the switch.
 */
export async function setupTypesRamdisk(
  log: ToolingLog,
  projects: readonly TsProject[],
  mountPath: string
): Promise<RamdiskTypesSession> {
  await assertMountUsable(mountPath);

  const linkedPaths = new Set<string>();

  await asyncForEachWithLimit(projects, 25, async (project) => {
    const repoRel = Path.relative(REPO_ROOT, project.directory);
    const repoTypesDir = Path.join(project.directory, TARGET_TYPES);
    const ramTypesDir = Path.join(mountPath, repoRel, TARGET_TYPES);

    await Fsp.mkdir(Path.dirname(ramTypesDir), { recursive: true });

    const existing = await lstatOrNull(repoTypesDir);
    if (existing?.isSymbolicLink()) {
      const current = await Fsp.readlink(repoTypesDir).catch(() => '');
      if (Path.resolve(Path.dirname(repoTypesDir), current) === ramTypesDir) {
        await Fsp.mkdir(ramTypesDir, { recursive: true });
        linkedPaths.add(repoTypesDir);
        return;
      }
      await Fsp.unlink(repoTypesDir);
    } else if (existing?.isDirectory()) {
      // Move pre-existing artifacts into the ramdisk so we don't lose cached .d.ts/.tsbuildinfo
      await moveDirContents(repoTypesDir, ramTypesDir);
      await Fsp.rm(repoTypesDir, { recursive: true, force: true });
    } else if (existing) {
      await Fsp.rm(repoTypesDir, { force: true });
    }

    await Fsp.mkdir(ramTypesDir, { recursive: true });
    // Ensure parent (target/) exists before symlinking the leaf.
    await Fsp.mkdir(Path.dirname(repoTypesDir), { recursive: true });
    await Fsp.symlink(ramTypesDir, repoTypesDir, 'dir');
    linkedPaths.add(repoTypesDir);
  });

  log.info(
    `[ramdisk] Linked ${linkedPaths.size} target/types directories into ${formatForLog(mountPath)}`
  );

  return {
    mountPath,
    linkedPaths,
    async unlink() {
      await asyncForEachWithLimit(Array.from(linkedPaths), 25, async (linkPath) => {
        const stat = await lstatOrNull(linkPath);
        if (stat?.isSymbolicLink()) {
          await Fsp.unlink(linkPath).catch(() => undefined);
        }
      });
      log.verbose(
        `[ramdisk] Removed ${linkedPaths.size} symlinks; mount preserved at ${mountPath}`
      );
    },
  };
}

/** Removes the ramdisk mirror tree without unmounting the volume. */
export async function purgeRamdiskMirror(log: ToolingLog, mountPath: string) {
  await Fsp.rm(mountPath, { recursive: true, force: true });
  await Fsp.mkdir(mountPath, { recursive: true });
  log.warning(`[ramdisk] Cleared mirror tree at ${formatForLog(mountPath)}`);
}

async function assertMountUsable(mountPath: string) {
  const stat = await statOrNull(mountPath);
  if (!stat) {
    throw new Error(
      `Ramdisk mount path does not exist: ${mountPath}. Create the mount first (see docs).`
    );
  }
  if (!stat.isDirectory()) {
    throw new Error(`Ramdisk mount path is not a directory: ${mountPath}`);
  }
  const probe = Path.join(mountPath, `.kbn-typecheck-write-probe-${process.pid}`);
  try {
    await Fsp.writeFile(probe, '');
  } catch (err) {
    throw new Error(`Ramdisk mount path is not writable: ${mountPath} (${(err as Error).message})`);
  } finally {
    await Fsp.unlink(probe).catch(() => undefined);
  }
}

async function moveDirContents(from: string, to: string) {
  await Fsp.mkdir(to, { recursive: true });
  const entries = await Fsp.readdir(from);
  await asyncForEachWithLimit(entries, 20, async (entry) => {
    const src = Path.join(from, entry);
    const dest = Path.join(to, entry);
    try {
      await Fsp.rename(src, dest);
    } catch (err) {
      // Cross-device rename: fall back to recursive copy + remove.
      if ((err as NodeJS.ErrnoException).code === 'EXDEV') {
        await Fsp.cp(src, dest, { recursive: true, force: true });
        await Fsp.rm(src, { recursive: true, force: true });
      } else {
        throw err;
      }
    }
  });
}

async function lstatOrNull(path: string) {
  try {
    return await Fsp.lstat(path);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

async function statOrNull(path: string) {
  try {
    return await Fsp.stat(path);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

function formatForLog(absolute: string) {
  const rel = Path.relative(REPO_ROOT, absolute);
  return rel.startsWith('..') ? absolute : `./${rel}`;
}
