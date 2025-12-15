/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

export function parseSerializedContent<T>(rawContent: string): T | undefined {
  try {
    return JSON.parse(rawContent) as T;
  } catch {
    return undefined;
  }
}

function joinUri(base: string, targetPath: string) {
  const cleanBase = base.replace(/\/+$/, '');
  const cleanTarget = targetPath.replace(/^\/+/, '');
  return `${cleanBase}/${cleanTarget}`;
}

export function join(left: string, ...rights: string[]) {
  const isUri = left.includes('://');
  if (isUri) {
    return rights.reduce((prev, current) => {
      return joinUri(prev, current);
    }, left);
  }
  return Path.join(left, ...rights);
}

const TAR_PLATFORM_OPTIONS =
  process.platform === 'linux'
    ? ['--no-same-owner', '--no-same-permissions', '--numeric-owner', '--delay-directory-restore']
    : [];

export const getTarPlatformOptions = () => TAR_PLATFORM_OPTIONS;

export const getTarCreateArgs = (fileArg: string, fileListPath: string): string[] => [
  '--create',
  '--file',
  fileArg,
  '--gzip',
  '--directory',
  REPO_ROOT,
  '--null',
  '--files-from',
  fileListPath,
];

export const resolveTarEnvironment = (): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    // these should speed up archiving on MacOS
    COPYFILE_DISABLE: '1',
    COPY_EXTENDED_ATTRIBUTES_DISABLE: '1',
  };

  return env;
};

export function doHashesMatch({
  currentFileHashes,
  storedFileHashes,
}: {
  currentFileHashes?: Record<string, string | null | undefined>;
  storedFileHashes?: Record<string, string | null | undefined>;
}): { result: boolean; message: string } {
  if (!currentFileHashes || !storedFileHashes) {
    return { result: true, message: 'No file hashes to compare.' };
  }

  const currentHashKeys = Object.keys(currentFileHashes);
  const storedHashKeys = Object.keys(storedFileHashes);
  const allKeys = new Set([...currentHashKeys, ...storedHashKeys]);

  for (const key of allKeys) {
    if (currentFileHashes[key] !== storedFileHashes[key]) {
      return {
        result: false,
        message: `Hash mismatch for file "${key}": current hash is "${currentFileHashes[key]}", stored hash is "${storedFileHashes[key]}"`,
      };
    }
  }
  return { result: true, message: 'All file hashes match.' };
}
