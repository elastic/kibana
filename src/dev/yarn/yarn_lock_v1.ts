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

    // Group header entries by package name to handle aliased packages
    // where yarn merges entries with different names into one block
    const entriesByName = new Map<string, string[]>();
    for (const entry of headerEntries) {
      const entryName = entry.split(/(?!^)@/)[0];
      const entryVersion = entry.substring(entryName.length + 1);
      if (!entriesByName.has(entryName)) {
        entriesByName.set(entryName, []);
      }
      entriesByName.get(entryName)!.push(entryVersion);
    }

    if (focusSet !== null && ![...entriesByName.keys()].some((n) => focusSet.has(n))) {
      continue;
    }

    // Parse the block body once (shared across all aliased names)
    let resolvedVersion: string | undefined;
    let resolvedUrl: string | undefined;
    let integrity: string | undefined;
    let dependencies: { [key: string]: string } | undefined;

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
          dependencies = dependencies || {};
          for (let j = i + 1; j < lines.length; j++) {
            const depLine = lines[j];
            if (!/^\s{4,}\S/.test(depLine)) break;
            const [depKey, depVersion] = splitDependencyLine(depLine);
            dependencies![depKey] = depVersion;
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
        `No resolved version found for package ${[...entriesByName.keys()].join(', ')}. Skipping.`
      );
      continue;
    }

    // Create a PackageInfo for each unique name in the header
    for (const [entryName, requestedVersions] of entriesByName) {
      const packageInfo: PackageInfo = {
        name: entryName,
        requestedVersions,
        resolvedVersion,
        resolvedUrl,
        integrity,
        dependencies: dependencies ? { ...dependencies } : undefined,
      };

      const entryKey = makeKey(entryName, resolvedVersion);
      if (!packages[entryKey]) {
        packages[entryKey] = packageInfo;
      } else {
        const existing = packages[entryKey];
        existing.requestedVersions = Array.from(
          new Set([...existing.requestedVersions, ...packageInfo.requestedVersions])
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
