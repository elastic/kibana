/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import * as Fsp from 'fs/promises';

import type { Task } from '../lib';

/**
 * package.json fields Node and the bundlers resolve a package's entry point from. `types` is
 * deliberately absent: `.d.ts` files are stripped from the build, so it never resolves here.
 */
const ENTRY_FIELDS = ['main', 'browser', 'module'] as const;

/** Extensions Node appends when a require target has no extension of its own. */
const RESOLVE_EXTENSIONS = ['.js', '.json', '.node'];

const isFile = async (path: string): Promise<boolean> => {
  try {
    return (await Fsp.stat(path)).isFile();
  } catch {
    return false;
  }
};

/**
 * Mirrors Node's CommonJS resolution of a package.json entry field: the literal path, then the
 * path with each known extension appended, then the path treated as a directory holding an index.
 */
const resolvesToFile = async (pkgDir: string, value: string): Promise<boolean> => {
  const target = Path.resolve(pkgDir, value);

  if (await isFile(target)) {
    return true;
  }

  for (const ext of RESOLVE_EXTENSIONS) {
    if (await isFile(target + ext)) {
      return true;
    }
  }

  for (const ext of RESOLVE_EXTENSIONS) {
    if (await isFile(Path.resolve(target, `index${ext}`))) {
      return true;
    }
  }

  return false;
};

/**
 * `target` directories are build artifacts of the external plugin template and are excluded from
 * the build on purpose, so entries pointing into one are out of scope rather than a regression.
 */
const pointsIntoExcludedTargetDir = (value: string): boolean =>
  Path.normalize(value).split(Path.sep)[0] === 'target';

/** Every entry value worth checking for a package, flattening `browser`'s object form. */
const getEntryValues = (pkg: Record<string, unknown>): Array<{ field: string; value: string }> => {
  const entries: Array<{ field: string; value: string }> = [];

  for (const field of ENTRY_FIELDS) {
    const value = pkg[field];

    if (typeof value === 'string') {
      entries.push({ field, value });
      continue;
    }

    // `browser` also accepts a map of request -> replacement. Only relative replacements point
    // into this package; bare specifiers resolve against node_modules and aren't ours to verify.
    if (field === 'browser' && value && typeof value === 'object') {
      for (const [request, replacement] of Object.entries(value as Record<string, unknown>)) {
        if (typeof replacement === 'string' && replacement.startsWith('.')) {
          entries.push({ field: `browser["${request}"]`, value: replacement });
        }
      }
    }
  }

  return entries;
};

export const AssertPackageEntryPoints: Task = {
  description: 'Verifying that package entry points resolve in the build',

  async run(config, log, build) {
    const problems: string[] = [];

    // `--with-test-plugins` pulls dev-only packages into the build too. Those are repo tooling,
    // invoked through scripts/ where the transpiler hook resolves TypeScript, and are never loaded
    // by the distributable's server process, so their entry points are out of scope here.
    const packages = config.getDistPackagesFromRepo().filter((pkg) => !pkg.isDevOnly());

    for (const pkg of packages) {
      const pkgDir = build.resolvePath(pkg.normalizedRepoRelativeDir);
      const manifestPath = Path.resolve(pkgDir, 'package.json');

      let manifest: Record<string, unknown>;
      try {
        manifest = JSON.parse(await Fsp.readFile(manifestPath, 'utf8'));
      } catch (error) {
        if (error.code === 'ENOENT') {
          continue;
        }
        throw error;
      }

      for (const { field, value } of getEntryValues(manifest)) {
        if (pointsIntoExcludedTargetDir(value)) {
          log.debug(`skipping ${pkg.manifest.id} "${field}": "${value}" (excluded target dir)`);
          continue;
        }

        if (!(await resolvesToFile(pkgDir, value))) {
          problems.push(`  ${pkg.manifest.id} declares "${field}": "${value}"`);
        }
      }
    }

    if (problems.length) {
      throw new Error(
        `The following packages declare an entry point which does not resolve in the build:\n\n` +
          `${problems.join('\n')}\n\n` +
          `This usually means the entry point still names a TypeScript source file; the build ` +
          `transpiles those to .js, so the path no longer exists in the distributable. Node ` +
          `falls back to index.js and emits a DEP0128 process warning, which Kibana treats as ` +
          `fatal (see src/setup_node_env/exit_on_warning.js), so the process exits on startup.\n\n` +
          `Drop the field when the package's entry is a root index file, or point it at the ` +
          `built .js path.`
      );
    }

    log.success('all package entry points resolve');
  },
};
