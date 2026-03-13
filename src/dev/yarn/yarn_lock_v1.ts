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

interface PackageInfo {
  name: string;
  requestedVersions: string[];
  resolvedVersion?: string;
  resolvedUrl?: string;
  integrity?: string;
  dependencies?: { [key: string]: string };
}

const makeKey = (name: string, version: string) => `${name}@${version}`;
const trimQuotes = (str: string) => str.replace(/(^"|"$)/g, '');

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
    const name = headerEntries[0].split(/(?!^)@/)[0];

    if (focusSet !== null && !focusSet.has(name)) {
      continue;
    }

    const requestedVersions = headerEntries.map((entry) => entry.substring(name.length + 1));

    const packageInfo: PackageInfo = {
      name,
      requestedVersions,
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      const [key, value] = line.split(/\s+/, 2).map(trimQuotes);
      if (key === 'version') {
        packageInfo.resolvedVersion = value;
      } else if (key === 'resolved') {
        packageInfo.resolvedUrl = value;
      } else if (key === 'integrity') {
        packageInfo.integrity = value;
      } else if (key === 'dependencies:') {
        let depCount = 0;
        if (focusSet === null) {
          packageInfo.dependencies = {};
          for (let j = i + 1; j < lines.length; j++) {
            const depLine = lines[j];
            if (depLine.trim() === '') break;
            const [depKey, depVersion] = depLine.trim().split(/\s+/).map(trimQuotes);
            packageInfo.dependencies![depKey] = depVersion;
            depCount++;
          }
        } else {
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].trim() === '') break;
            depCount++;
          }
        }
        i += depCount;
      }
    }

    if (!packageInfo.resolvedVersion) {
      console.warn(`No resolved version found for package ${name}. Skipping.`);
      continue;
    }
    const entryKey = makeKey(name, packageInfo.resolvedVersion!);
    if (!packages[entryKey]) {
      packages[entryKey] = packageInfo;
    } else {
      console.warn(`Duplicate entry for ${entryKey} found. Skipping.`);
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
