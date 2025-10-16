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
// eslint-disable-next-line depend/ban-dependencies
import jsYaml from 'js-yaml';

/**
 * Parsed yarn.lock file contents mapping `name@versionRange` strings to information from
 * the yarn.lock file that is used to satisfy that request.
 */
export interface YarnLock {
  /** a simple map of `name@versionrange` tags to metadata about a package */
  /**
   */
  [key: string]: {
    /** resolved version installed for this pacakge */
    version: string;
    /** resolved url for this pacakge */
    resolution: string;
    /** yarn calculated integrity value for this package */
    checksum: string;
    languageName: 'node' | 'unknown' | string;
    linkType: 'hard' | 'soft';
    dependencies?: {
      /** name => versionRange dependencies listed in package's manifest */
      [key: string]: string;
    };
    bin?: {
      [key: string]: string;
    };
    peerDependencies?: {
      /** name => versionRange dependencies listed in package's manifest */
      [key: string]: string;
    };
    peerDependenciesMeta?: Record<
      string,
      Partial<{
        optional: boolean;
      }>
    >;
    dependenciesMeta?: Record<
      string,
      Partial<{
        optional: boolean;
      }>
    >;
  };
}

/**
 * Parse any yarn.lock content into a YarnLock map
 */
export function parseLockfile(content: string): YarnLock {
  try {
    const lockFile = jsYaml.load(content);
    return lockFile as YarnLock;
  } catch (e) {
    throw new Error('unable to read yarn.lock file, please run `yarn kbn bootstrap`', {
      cause: e,
    } as any);
  }
}

/**
 * Convert a parsed yarn.lock file back to a string
 */
export function stringifyLockFile(yarnLock: YarnLock): string {
  return jsYaml.dump(yarnLock, {});
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
