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

import { parse as parseYaml } from 'yaml';
import { REPO_ROOT } from '@kbn/repo-info';

const PKG_JSON_PATH = resolve(REPO_ROOT, 'package.json');
const PNPM_LOCK_PATH = resolve(REPO_ROOT, 'pnpm-lock.yaml');
const DEPENDENCIES_FIELDS = ['dependencies', 'devDependencies'] as const;

interface ImporterDep {
  specifier: string;
  version: string;
}

export function checkSemverRanges(
  runOptions: {
    fix?: boolean;
    pkgJsonContent?: string;
    pnpmLockContent?: string;
  } = {}
) {
  const pkgJsonContent =
    runOptions.pkgJsonContent ?? readFileSync(PKG_JSON_PATH, { encoding: 'utf-8' });
  const pnpmLockContent =
    runOptions.pnpmLockContent ?? readFileSync(PNPM_LOCK_PATH, { encoding: 'utf-8' });
  const fix = runOptions.fix ?? false;

  if (!pnpmLockContent || !pkgJsonContent) {
    throw new Error('Both package.json and pnpm-lock.yaml contents must be provided.');
  }

  const pkg = JSON.parse(pkgJsonContent);
  const resolveVersionFromLock = makeResolver(pnpmLockContent);

  let totalFixes = 0;
  type FieldName = (typeof DEPENDENCIES_FIELDS)[number];
  const fixesPerField: Partial<Record<FieldName, number>> = {};

  for (const field of DEPENDENCIES_FIELDS) {
    const deps = pkg[field];
    if (!deps || typeof deps !== 'object') continue;

    for (const [name, version] of Object.entries(deps)) {
      if (typeof version !== 'string') continue;

      if (version.startsWith('^') || version.startsWith('~')) {
        const resolvedVersion = resolveVersionFromLock(name, version);
        if (!resolvedVersion) {
          throw new Error(
            `Could not resolve version for ${name} with version ${version} from pnpm-lock.yaml` +
              '\n' +
              `Please ensure that your pnpm-lock.yaml is up to date.`
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

  // pnpm.overrides must also be pinned (no ranges).
  const overrides = pkg.pnpm?.overrides;
  if (overrides && typeof overrides === 'object') {
    const overridesErrors = [];

    for (const [name, version] of Object.entries(overrides)) {
      if (typeof version !== 'string') continue;
      if (version.startsWith('^') || version.startsWith('~')) {
        // override keys can be `name`, `parent>child`, etc. The resolved package
        // is the last segment of the key.
        const depName = name.split('>').pop()!;
        const suggestedVersion = resolveVersionFromLock(depName, version);
        overridesErrors.push(`${name}: ${version} => installed: ${suggestedVersion ?? '?'}`);
      }
    }

    if (overridesErrors.length > 0) {
      throw new Error(
        `[no-pkg-semver-ranges] Found ${overridesErrors.length} version(s) ` +
          `with ^/~ in package.json's pnpm.overrides field:\n` +
          overridesErrors.join('\n') +
          `\n ^-- Please remove semver ranges and pin the overrides manually.`
      );
    }
  }

  return { totalFixes, fixesPerField };
}

/**
 * Builds a resolver that, given a package name and the exact specifier range
 * declared in package.json, returns the resolved version recorded for the root
 * importer in pnpm-lock.yaml. Peer suffixes (e.g. `(zod@4.4.3)`) are stripped.
 */
function makeResolver(pnpmLockContent: string) {
  const lock = (parseYaml(pnpmLockContent) ?? {}) as {
    importers?: Record<string, { dependencies?: Record<string, ImporterDep> }>;
  };
  const rootDeps = lock.importers?.['.']?.dependencies ?? {};

  return (name: string, specifier: string): string | null => {
    const dep = rootDeps[name];
    if (!dep || dep.specifier !== specifier) {
      return null;
    }
    return stripPeerSuffix(dep.version);
  };
}

function stripPeerSuffix(version: string): string {
  const paren = version.indexOf('(');
  return paren === -1 ? version : version.slice(0, paren);
}
