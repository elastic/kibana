/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import Fs from 'fs';
import { createHash } from 'crypto';
import { pipeline } from 'stream/promises';
import Path from 'path';
import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
import type { SomeDevLog } from '@kbn/some-dev-log';
import globby from 'globby';
import { asyncForEachWithLimit } from '@kbn/std';
import {
  CACHE_IGNORE_GLOBS,
  GCLOUD_ACTIVATE_SCRIPT,
  GCS_BUCKET_NAME,
  LOCAL_CACHE_ROOT,
  TYPES_DIRECTORY_GLOB,
  TYPE_CHECK_CONFIG_GLOB,
} from './constants';
export type { ArchiveMetadata, PullRequestArchiveMetadata } from './file_system/types';

export const getPullRequestNumber = (): string | undefined => {
  const value = process.env.BUILDKITE_PULL_REQUEST ?? '';
  if (value.length === 0 || value === 'false') {
    return undefined;
  }

  return value;
};

export async function resolveCurrentCommitSha(): Promise<string | undefined> {
  if (process.env.BUILDKITE_COMMIT) {
    return process.env.BUILDKITE_COMMIT;
  }

  const { stdout } = await execa('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT });
  const sha = stdout.trim();
  return sha.length > 0 ? sha : undefined;
}

export async function readRecentCommitShas(limit: number): Promise<string[]> {
  const { stdout } = await execa('git', ['rev-list', '--max-count', String(limit), 'HEAD'], {
    cwd: REPO_ROOT,
  });
  return stdout
    .split('\n')
    .map((sha: string) => sha.trim())
    .filter((sha: string) => sha.length > 0);
}

export function isCiEnvironment() {
  return (process.env.CI ?? '').toLowerCase() === 'true';
}

export async function withGcsAuth<TReturn>(
  log: SomeDevLog,
  action: () => Promise<TReturn>
): Promise<TReturn> {
  await execa(GCLOUD_ACTIVATE_SCRIPT, [GCS_BUCKET_NAME], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });

  try {
    return await action();
  } finally {
    try {
      await execa(GCLOUD_ACTIVATE_SCRIPT, ['--unset-impersonation'], {
        cwd: REPO_ROOT,
        stdio: 'inherit',
      });
    } catch (unsetError) {
      const unsetErrorDetails =
        unsetError instanceof Error ? unsetError.message : String(unsetError);
      log.warning(`Failed to unset GCP impersonation: ${unsetErrorDetails}`);
    }
  }
}

export async function ensureLocalCacheRoot() {
  await Fs.promises.mkdir(LOCAL_CACHE_ROOT, { recursive: true });
}

export function buildCandidateShaList(currentSha: string | undefined, history: string[]): string[] {
  const uniqueShas = new Set<string>();

  if (currentSha) {
    uniqueShas.add(currentSha);
  }

  for (const sha of history) {
    if (sha) {
      uniqueShas.add(sha);
    }
  }

  return Array.from(uniqueShas);
}

export async function cleanTypeCheckArtifacts(log: SomeDevLog) {
  const directoryMatches = await globby(TYPES_DIRECTORY_GLOB, {
    cwd: REPO_ROOT,
    absolute: true,
    onlyDirectories: true,
    followSymbolicLinks: false,
    ignore: CACHE_IGNORE_GLOBS,
  });
  const directoryPaths: string[] = Array.from(new Set<string>(directoryMatches));

  const configMatches = await globby(TYPE_CHECK_CONFIG_GLOB, {
    cwd: REPO_ROOT,
    absolute: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    ignore: CACHE_IGNORE_GLOBS,
  });
  const configPaths: string[] = Array.from(new Set<string>(configMatches));

  await asyncForEachWithLimit(directoryPaths, 10, async (directoryPath) => {
    await Fs.promises.rm(directoryPath, { recursive: true, force: true });
  });

  await asyncForEachWithLimit(configPaths, 25, async (configPath) => {
    await Fs.promises.rm(configPath, { force: true });
  });

  if (directoryPaths.length > 0 || configPaths.length > 0) {
    log.info(
      `Cleared ${directoryPaths.length} type cache directories and ${configPaths.length} config files before restore.`
    );
  }
}

/**
 * Calculate the SHA256 hash of a file.
 * Returns null if the file doesn't exist.
 */
export async function calculateFileHash(filePath: string): Promise<string | null> {
  const fullPath = Path.resolve(REPO_ROOT, filePath);
  if (!Fs.existsSync(fullPath)) {
    return null;
  }

  const hash = createHash('sha256');
  await pipeline(Fs.createReadStream(fullPath), hash);
  return hash.digest('hex');
}

/**
 * Calculate hashes for a set of files relative to REPO_ROOT.
 * Returns a record mapping file paths to their hashes (or null if file doesn't exist).
 */
export async function calculateFileHashes(
  filePaths: string[]
): Promise<Record<string, string | null>> {
  const hashes: Record<string, string | null> = {};
  await asyncForEachWithLimit(filePaths, 10, async (filePath) => {
    hashes[filePath] = await calculateFileHash(filePath);
  });
  return hashes;
}
