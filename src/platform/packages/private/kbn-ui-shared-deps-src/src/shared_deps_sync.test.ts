/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

/**
 * These lists are maintained by hand and must stay in sync, otherwise the bundle
 * either silently duplicates a module into every plugin (missing external) or
 * serves a stale bundle (missing moon cache input). The build gives no signal on
 * drift, so these tests are the signal.
 */
const PKG_DIR = Path.resolve(__dirname, '..');
const entrySource = Fs.readFileSync(Path.resolve(__dirname, 'entry.js'), 'utf8');
const definitionsSource = Fs.readFileSync(Path.resolve(__dirname, 'definitions.js'), 'utf8');
const moonExtendSource = Fs.readFileSync(Path.resolve(PKG_DIR, 'moon.extend.yml'), 'utf8');

describe('entry.js exports vs externals map', () => {
  it('exports exactly the symbols referenced by the externals map', () => {
    const exported = entryExportedSymbols(entrySource);
    const referenced = externalsReferencedSymbols(definitionsSource);

    const missingExports = [...referenced].filter((s) => !exported.has(s));
    const unreferencedExports = [...exported].filter((s) => !referenced.has(s));

    expect({ missingExports, unreferencedExports }).toEqual({
      missingExports: [],
      unreferencedExports: [],
    });
  });
});

describe('entry.js @kbn imports vs moon cache inputs', () => {
  it('has a moon.extend.yml input glob covering every @kbn package it imports', () => {
    const uncovered = kbnPackagesImportedByEntry(entrySource)
      .map((pkg) => ({ pkg, dir: repoRelativePackageDir(pkg) }))
      .filter(({ dir }) => !moonExtendSource.includes(`/${dir}/`));

    expect(uncovered).toEqual([]);
  });
});

function entryExportedSymbols(source: string): Set<string> {
  return new Set([...source.matchAll(/export const (\w+)\s*=/g)].map((m) => m[1]));
}

function externalsReferencedSymbols(source: string): Set<string> {
  return new Set([...source.matchAll(/__kbnSharedDeps__\.(\w+)/g)].map((m) => m[1]));
}

function kbnPackagesImportedByEntry(source: string): string[] {
  const specifiers = [...source.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map((m) => m[1]);
  const roots = specifiers
    .filter((spec) => spec.startsWith('@kbn/'))
    .map((spec) => spec.split('/').slice(0, 2).join('/'));
  return [...new Set(roots)].sort();
}

function repoRelativePackageDir(pkg: string): string {
  const pkgJson = require.resolve(`${pkg}/package.json`);
  return Path.relative(REPO_ROOT, Path.dirname(pkgJson));
}
