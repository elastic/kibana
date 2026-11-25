/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import { satisfies, valid as validSemver, validRange } from 'semver';
import { parse } from 'yaml';

import { REPO_ROOT } from '@kbn/repo-info';

interface FloatingDependency {
  parent: string;
  version: string;
  dependency: string;
}

interface PackageManifest {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

function isLatestSpecifier(specifier: string): boolean {
  if (specifier === 'latest') return true;
  return (
    specifier.startsWith('npm:') && specifier.slice(specifier.lastIndexOf('@') + 1) === 'latest'
  );
}

function isPinnedOverride(override: string): boolean {
  const version = override.startsWith('npm:')
    ? override.slice(override.lastIndexOf('@') + 1)
    : override;
  return validSemver(version) !== null;
}

function packageDirectories(modulesDir: string): string[] {
  if (!fs.existsSync(modulesDir)) return [];

  return fs.readdirSync(modulesDir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(modulesDir, entry.name);
    if (!isDirectory(entryPath, entry) || entry.name.startsWith('.')) return [];
    if (!entry.name.startsWith('@')) return [entryPath];
    return fs
      .readdirSync(entryPath, { withFileTypes: true })
      .filter((scopedEntry) => isDirectory(path.join(entryPath, scopedEntry.name), scopedEntry))
      .map((scopedEntry) => path.join(entryPath, scopedEntry.name));
  });
}

function isDirectory(entryPath: string, entry: fs.Dirent): boolean {
  return (
    entry.isDirectory() ||
    (entry.isSymbolicLink() && fs.existsSync(entryPath) && fs.statSync(entryPath).isDirectory())
  );
}

/** Find installed packages whose runtime dependencies use the floating `latest` tag. */
export function findFloatingDependencies(modulesDirs: readonly string[]): FloatingDependency[] {
  const findings: FloatingDependency[] = [];
  const pending = modulesDirs.flatMap(packageDirectories);
  const seen = new Set<string>();

  while (pending.length > 0) {
    const packageDir = pending.pop();
    if (packageDir === undefined) break;
    const realPackageDir = fs.realpathSync(packageDir);
    if (seen.has(realPackageDir)) continue;
    seen.add(realPackageDir);
    const manifestPath = path.join(packageDir, 'package.json');
    if (!fs.existsSync(manifestPath)) continue;

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as PackageManifest;
    // autoInstallPeers is disabled, so peer tags do not resolve new packages here.
    for (const field of ['dependencies', 'optionalDependencies'] as const) {
      for (const [dependency, specifier] of Object.entries(manifest[field] ?? {})) {
        if (isLatestSpecifier(specifier)) {
          findings.push({ parent: manifest.name, version: manifest.version, dependency });
        }
      }
    }

    pending.push(...packageDirectories(path.join(packageDir, 'node_modules')));
  }

  return findings;
}

/** Return floating dependencies that have no matching pinned pnpm override. */
export function findUnpinnedFloatingDependencies(
  modulesDirs: readonly string[],
  overrides: Record<string, string>
): FloatingDependency[] {
  return findFloatingDependencies(modulesDirs).filter(({ parent, version, dependency }) => {
    const matchingOverrides = Object.entries(overrides)
      .filter(([selector]) => {
        if (selector === dependency || selector === `${parent}>${dependency}`) return true;
        const suffix = `>${dependency}`;
        if (!selector.startsWith(`${parent}@`) || !selector.endsWith(suffix)) return false;
        const parentRange = selector.slice(parent.length + 1, -suffix.length);
        return validRange(parentRange) !== null && satisfies(version, parentRange);
      })
      .map(([, override]) => override);
    return (
      matchingOverrides.length === 0 ||
      matchingOverrides.some((override) => !isPinnedOverride(override))
    );
  });
}

export function checkFloatingDependencyTags(): void {
  const rootModulesDir = path.join(REPO_ROOT, 'node_modules');
  if (!fs.existsSync(rootModulesDir)) {
    throw new Error('node_modules is missing; run `node scripts/kbn bootstrap` first.');
  }

  const workspace = parse(fs.readFileSync(path.join(REPO_ROOT, 'pnpm-workspace.yaml'), 'utf8')) as {
    overrides?: Record<string, string>;
    packages?: string[];
  };
  const modulesDirs = [
    rootModulesDir,
    ...(workspace.packages ?? []).map((packageDir) =>
      path.join(REPO_ROOT, packageDir, 'node_modules')
    ),
  ];
  const findings = findUnpinnedFloatingDependencies(modulesDirs, workspace.overrides ?? {});

  if (findings.length > 0) {
    process.stderr.write('Installed packages declare unpinned `latest` runtime dependencies:\n');
    for (const { parent, version, dependency } of findings) {
      process.stderr.write(`  ${parent}@${version} > ${dependency}\n`);
    }
    process.stderr.write(
      'Pin each dependency in pnpm-workspace.yaml overrides and bootstrap again.\n'
    );
    process.exitCode = 1;
  }
}
