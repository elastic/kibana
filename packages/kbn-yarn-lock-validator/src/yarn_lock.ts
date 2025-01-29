/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fsp from 'fs/promises';
import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
// @ts-expect-error published types are worthless
import * as YarnLockFile from '@yarnpkg/lockfile';

/**
 * Parsed yarn.lock file contents mapping `name@versionRange` strings to information from
 * the yarn.lock file that is used to satisfy that request.
 */
export interface YarnLock {
  /** a simple map of `name@versionrange` tags to metadata about a package */
  [key: string]: {
    /** resolved version installed for this pacakge */
    version: string;
    /** resolved url for this pacakge */
    resolved: string;
    /** yarn calculated integrity value for this package */
    integrity: string;
    dependencies?: {
      /** name => versionRange dependencies listed in package's manifest */
      [key: string]: string;
    };
    optionalDependencies?: {
      /** name => versionRange dependencies listed in package's manifest */
      [key: string]: string;
    };
  };
}

/**
 * Parse any yarn.lock content into a YarnLock map
 */
export function parseLockfile(content: string): YarnLock {
  const result = YarnLockFile.parse(content);
  if (result.type === 'success') {
    return result.object;
  }

  throw new Error('unable to read yarn.lock file, please run `yarn kbn bootstrap`');
}

/**
 * Convert a parsed yarn.lock file back to a string
 */
export function stringifyLockFile(yarnLock: YarnLock): string {
  return YarnLockFile.stringify(yarnLock);
}

/**
 * Parse any yarn.lock content into a YarnLock map
 */
export async function readYarnLock(): Promise<YarnLock> {
  try {
    const contents = await Fsp.readFile(Path.resolve(REPO_ROOT, 'yarn.lock'), 'utf8');
    return parseLockfile(contents);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }

    throw error;
  }
}
