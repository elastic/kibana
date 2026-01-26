/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

const PKG_JSON_PATH = resolve(REPO_ROOT, 'package.json');
const YARN_LOCK_PATH = resolve(REPO_ROOT, 'yarn.lock');
const DEPENDENCIES_FIELDS = ['dependencies', 'devDependencies'] as const;

export function checkSemverRanges(
  runOptions: {
    fix?: boolean;
    pkgJsonContent?: string;
    yarnLockContent?: string;
  } = {}
) {
  const pkgJsonContent =
    runOptions.pkgJsonContent ?? readFileSync(PKG_JSON_PATH, { encoding: 'utf-8' });
  const yarnLockContent =
    runOptions.yarnLockContent ?? readFileSync(YARN_LOCK_PATH, { encoding: 'utf-8' });
  const fix = runOptions.fix ?? false;

  if (!yarnLockContent || !pkgJsonContent) {
    throw new Error('Both package.json and yarn.lock contents must be provided.');
  }

  const pkg = JSON.parse(pkgJsonContent);
  const yarnLockLines = yarnLockContent.split('\n');
  const resolveVersionFromYarnLock = (name: string, version: string): string | null => {
    const versionSpec = `${name}@${version}`;
    const versionLineIndex = yarnLockLines.findIndex(
      (line) =>
        (line.includes(versionSpec) || line.includes(`"${versionSpec}"`)) &&
        !line.match(/^\s+#/) &&
        !line.includes('@types/' + name)
    );
    if (versionLineIndex === -1) {
      return null;
    }

    const versionMatch = yarnLockLines[versionLineIndex + 1].match('^\\s+version "(.*?)"$');
    if (versionMatch && versionMatch[1]) {
      return versionMatch[1];
    }
    return null;
  };

  let totalFixes = 0;
  type FieldName = (typeof DEPENDENCIES_FIELDS)[number];
  const fixesPerField: Partial<Record<FieldName, number>> = {};

  for (const field of DEPENDENCIES_FIELDS) {
    const deps = pkg[field];
    if (!deps || typeof deps !== 'object') continue;

    for (const [name, version] of Object.entries(deps)) {
      if (typeof version !== 'string') continue;

      if (version.startsWith('^') || version.startsWith('~')) {
        const resolvedVersion = resolveVersionFromYarnLock(name, version);
        if (!resolvedVersion) {
          throw new Error(
            `Could not resolve version for ${name} with version ${version} from yarn.lock` +
              '\n' +
              `Please ensure that your yarn.lock is up to date.`
          );
        }

        deps[name] = resolvedVersion;
        totalFixes++;

        fixesPerField[field] = (fixesPerField[field] ?? 0) + 1;
      }
    }
  }

  if (totalFixes > 0) {
    const fieldsSummary = Object.entries(fixesPerField)
      .map(([field, count]) => `${field}: ${count}`)
      .join(', ');

    if (fix) {
      writeFileSync(PKG_JSON_PATH, JSON.stringify(pkg, null, 2));
      // eslint-disable-next-line no-console
      console.warn(
        `[no-pkg-semver-ranges] Removed ^/~ from ${totalFixes} version(s) ` +
          `in package.json (${fieldsSummary}) - don't forget to bootstrap!`
      );
    } else {
      throw new Error(
        `[no-pkg-semver-ranges] Found ${totalFixes} version(s) ` +
          `with ^/~ in package.json (${fieldsSummary}). ` +
          `Run the script with --fix to automatically resolve them.`
      );
    }
  }

  if (pkg.resolutions && typeof pkg.resolutions === 'object') {
    const resolutions = pkg.resolutions;
    const resolutionsErrors = [];

    for (const [name, version] of Object.entries(resolutions)) {
      if (typeof version !== 'string') continue;
      if (version.startsWith('^') || version.startsWith('~')) {
        const depName = name.split('**/').pop()!;
        const suggestedVersion = resolveVersionFromYarnLock(depName, version);
        resolutionsErrors.push(`${name}: ${version} => installed: ${suggestedVersion ?? '?'}`);
      }
    }

    if (resolutionsErrors.length > 0) {
      throw new Error(
        `[no-pkg-semver-ranges] Found ${resolutionsErrors.length} version(s) ` +
          `with ^/~ in package.json's resolutions field:\n` +
          resolutionsErrors.join('\n') +
          `\n ^-- Please remove semver ranges and pin the resolutions manually.`
      );
    }
  }

  return { totalFixes, fixesPerField };
}
