/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

import fs from 'fs';

export interface PackageInfo {
  name: string;
  requestedVersions: string[];
  resolvedVersion?: string;
  resolvedUrl?: string;
  integrity?: string;
  dependencies?: { [key: string]: string };
}

const makeKey = (name: string, version: string) => `${name}@${version}`;
const trimQuotes = (str: string) => str.replace(/(^"|"$)/g, '');

/** Splits a yarn.lock header descriptor into [packageName, requestedRangeOrDescriptor]. */
const splitYarnLockDescriptor = (entry: string): [string, string] => {
  if (entry.startsWith('@')) {
    const versionSeparator = entry.indexOf('@', 1);
    if (versionSeparator === -1) {
      throw new Error(`Invalid yarn.lock descriptor: ${entry}`);
    }
    return [entry.slice(0, versionSeparator), entry.slice(versionSeparator + 1)];
  }
  const at = entry.indexOf('@');
  if (at === -1) {
    throw new Error(`Invalid yarn.lock descriptor: ${entry}`);
  }
  return [entry.slice(0, at), entry.slice(at + 1)];
};

const splitDependencyLine = (line: string) => {
  const match = line.trim().match(/^(\S+)\s+(.+)$/);

  if (!match) {
    throw new Error(`Unable to parse yarn.lock dependency line: ${line}`);
  }

  return [trimQuotes(match[1]), trimQuotes(match[2])] as const;
};

export const parseYarnLock = (content: string, focus?: string[]): Record<string, PackageInfo> => {
  const packages: Record<string, PackageInfo> = {};
  const contentWithoutComments = content.replace(/#.*$/gm, '').trim();
  const focusSet = focus?.length ? new Set<string>(focus) : null;

  const blocks = contentWithoutComments.split('\n\n');
  for (const block of blocks) {
    const lines = block.split('\n').filter((line) => line.trim() !== '');
    if (lines.length === 0) continue;

    const header = lines[0].replace(/:$/, '').trim();
    const headerEntries = header.split(', ').map(trimQuotes);

    if (focusSet !== null) {
      const anyFocused = headerEntries.some((entry) => {
        const [pkgName] = splitYarnLockDescriptor(entry);
        return focusSet.has(pkgName);
      });
      if (!anyFocused) {
        continue;
      }
    }

    let resolvedVersion: string | undefined;
    let resolvedUrl: string | undefined;
    let integrity: string | undefined;
    let blockDependencies: { [key: string]: string } | undefined;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      const [key, value] = line.split(/\s+/, 2).map(trimQuotes);
      if (key === 'version') {
        resolvedVersion = value;
      } else if (key === 'resolved') {
        resolvedUrl = value;
      } else if (key === 'integrity') {
        integrity = value;
      } else if (key === 'dependencies:' || key === 'optionalDependencies:') {
        let depCount = 0;
        if (focusSet === null) {
          blockDependencies = blockDependencies || {};
          for (let j = i + 1; j < lines.length; j++) {
            const depLine = lines[j];
            if (!/^\s{4,}\S/.test(depLine)) break;
            const [depKey, depVersion] = splitDependencyLine(depLine);
            blockDependencies[depKey] = depVersion;
            depCount++;
          }
        } else {
          for (let j = i + 1; j < lines.length; j++) {
            if (!/^\s{4,}\S/.test(lines[j])) break;
            depCount++;
          }
        }
        i += depCount;
      }
    }

    if (!resolvedVersion) {
      console.warn(
        `No resolved version found for package block starting with ${headerEntries[0]}. Skipping.`
      );
      continue;
    }

    for (const headerEntry of headerEntries) {
      const [pkgName, requestedVersion] = splitYarnLockDescriptor(headerEntry);
      if (focusSet !== null && !focusSet.has(pkgName)) {
        continue;
      }

      const entryKey = makeKey(pkgName, resolvedVersion);
      if (!packages[entryKey]) {
        packages[entryKey] = {
          name: pkgName,
          requestedVersions: [requestedVersion],
          resolvedVersion,
          resolvedUrl,
          integrity,
          dependencies: blockDependencies ? { ...blockDependencies } : undefined,
        };
      } else {
        const existing = packages[entryKey];
        existing.requestedVersions = Array.from(
          new Set([...existing.requestedVersions, requestedVersion])
        ).sort();
      }
    }
  }
  return packages;
};

export const parseYarnLockFile = (yarnLockPath: string, focus?: string[]) => {
  const yarnLockContent = fs.readFileSync(yarnLockPath, 'utf8');
  return parseYarnLock(yarnLockContent, focus);
};

if (require.main === module) {
  const yarnLockPath = process.argv[2] || 'yarn.lock';
  const outputPath = process.argv[3];

  const yarnLock = parseYarnLockFile(yarnLockPath);
  if (outputPath) {
    fs.writeFileSync(outputPath, JSON.stringify(yarnLock, null, 2));
    console.log(`Yarn lock data written to ${outputPath}`);
    process.exit(0);
  } else {
    console.log(JSON.stringify(yarnLock, null, 2));
  }
}
