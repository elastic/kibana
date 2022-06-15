/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import isPathInside from 'is-path-inside';

export interface Owner {
  type: 'pkg' | 'src';
  path: string;
}
export interface TestGroups {
  unit?: string[];
  integration?: string[];
}
export type GroupedTestFiles = Map<Owner, TestGroups>;

/**
 * Consumes the list of test files discovered along with the srcRoots and packageDirs to assign
 * each test file to a specific "owner", either a package or src directory, were we will eventually
 * expect to find relevant config files
 */
export function groupTestFiles(
  testFiles: string[],
  srcRoots: string[],
  packageDirs: string[]
): { grouped: GroupedTestFiles; invalid: string[] } {
  const invalid: string[] = [];
  const testsByOwner = new Map<string, TestGroups>();

  for (const testFile of testFiles) {
    const type = testFile.includes('integration_tests') ? 'integration' : 'unit';
    let ownerKey;
    // try to match the test file to a package first
    for (const pkgDir of packageDirs) {
      if (isPathInside(testFile, pkgDir)) {
        ownerKey = `pkg:${pkgDir}`;
        break;
      }
    }

    // try to match the test file to a src root
    if (!ownerKey) {
      for (const srcRoot of srcRoots) {
        if (isPathInside(testFile, srcRoot)) {
          const segments = Path.relative(srcRoot, testFile).split(Path.sep);
          if (segments.length > 1) {
            ownerKey = `src:${Path.join(srcRoot, segments[0])}`;
            break;
          }

          // if there are <= 1 relative segments then this file is directly in the "root"
          // which isn't supported, roots are directories which have test dirs in them.
          // We should ignore this match and match a higher-level root if possible
          continue;
        }
      }
    }

    if (!ownerKey) {
      invalid.push(testFile);
      continue;
    }

    const tests = testsByOwner.get(ownerKey);
    if (!tests) {
      testsByOwner.set(ownerKey, { [type]: [testFile] });
    } else {
      const byType = tests[type];
      if (!byType) {
        tests[type] = [testFile];
      } else {
        byType.push(testFile);
      }
    }
  }

  return {
    invalid,
    grouped: new Map<Owner, TestGroups>(
      [...testsByOwner.entries()].map(([key, tests]) => {
        const [type, ...path] = key.split(':');
        const owner: Owner = {
          type: type as Owner['type'],
          path: path.join(':'),
        };
        return [owner, tests];
      })
    ),
  };
}
