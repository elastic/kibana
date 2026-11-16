/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable import/no-nodejs-modules -- the test inspects source files and the package manifest on disk */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { makeMatcher } from '@kbn/picomatcher';
import { REPO_ROOT } from '@kbn/repo-info';
import { readPackageManifest } from '@kbn/repo-packages';

const PACKAGE_DIR = resolve(__dirname, '../..');

const isTestFile = (path: string): boolean =>
  /\.test\.tsx?$|\.test_helpers\.ts$|[\\/](test_helpers|__mocks__|integration_tests)[\\/]/.test(
    path
  );

const listSourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(path);
    }
    return entry.name.endsWith('.ts') && !isTestFile(path) ? [path] : [];
  });

const toPackageRelative = (path: string): string =>
  relative(PACKAGE_DIR, path).split('\\').join('/');

describe('readManagedWorkflowYaml build configuration', () => {
  const { build } = readPackageManifest(REPO_ROOT, join(PACKAGE_DIR, 'kibana.jsonc'));
  const isShippedRaw = makeMatcher(build?.noParse ?? []);
  const sources = listSourceFiles(__dirname).map((path) => ({
    path,
    content: readFileSync(path, 'utf8'),
  }));

  it('transpiles every YAML file that is imported as a module', () => {
    const imported = sources.flatMap(({ path, content }) =>
      Array.from(content.matchAll(/from '(\.[^']+\.ya?ml)'/g), ([, specifier]) =>
        toPackageRelative(resolve(dirname(path), specifier))
      )
    );

    expect(imported.length).toBeGreaterThan(0);
    expect(imported.filter((file) => isShippedRaw(file))).toEqual([]);
  });

  it('ships every lazily read YAML file as-is', () => {
    const lazilyRead = sources.flatMap(({ path, content }) =>
      Array.from(
        content.matchAll(/readManagedWorkflowYaml\(__dirname, '([^']+)'\)/g),
        ([, fileName]) => resolve(dirname(path), fileName)
      )
    );

    expect(lazilyRead.length).toBeGreaterThan(0);
    expect(lazilyRead.filter((file) => !existsSync(file))).toEqual([]);
    expect(lazilyRead.map(toPackageRelative).filter((file) => !isShippedRaw(file))).toEqual([]);
  });
});
