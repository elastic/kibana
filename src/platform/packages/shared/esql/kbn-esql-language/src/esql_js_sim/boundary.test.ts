/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join, relative, resolve, sep } from 'path';

const SOURCE_ROOT = join(__dirname, '..');
const PACKAGES = ['grammar', 'definitions'] as const;

const IMPORT = /(?:from|require\(|import\()\s*['"]([^'"]+)['"]/g;
// What esql-js packages can depend on, plus Node built-ins for their generators.
const ALLOWED_MODULES = [/^@elastic\/esql/, /^antlr4$/, /^fs$/, /^path$/];

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }

    return /\.(ts|js)$/.test(name) ? [path] : [];
  });

const importsOf = (file: string): string[] =>
  [...readFileSync(file, 'utf8').matchAll(IMPORT)].map(([, source]) => source);

const isRelative = (source: string): boolean => /^\.\.?(\/|$)/.test(source);

const isInside = (dir: string, path: string): boolean =>
  path === dir || path.startsWith(`${dir}${sep}`);

// The file or folder a relative import points to.
const targetOf = (file: string, source: string): string => resolve(dirname(file), source);

const isPackageEntry = (target: string): boolean =>
  PACKAGES.some(
    (name) => target === join(__dirname, name) || target === join(__dirname, name, 'index')
  );

const describeImport = (file: string, source: string): string =>
  `${relative(SOURCE_ROOT, file)}: ${source}`;

describe('simulated esql-js packages boundary', () => {
  it('imports nothing from Kibana', () => {
    const violations = sourceFiles(__dirname).flatMap((file) =>
      importsOf(file)
        .filter((source) =>
          isRelative(source)
            ? !isInside(__dirname, targetOf(file, source))
            : !ALLOWED_MODULES.some((pattern) => pattern.test(source))
        )
        .map((source) => describeImport(file, source))
    );

    expect(violations).toEqual([]);
  });

  it('is imported by Kibana code only through the package entries', () => {
    const violations = sourceFiles(SOURCE_ROOT)
      .filter((file) => !isInside(__dirname, file))
      .flatMap((file) =>
        importsOf(file)
          .filter(isRelative)
          .filter((source) => {
            const target = targetOf(file, source);

            return isInside(__dirname, target) && !isPackageEntry(target);
          })
          .map((source) => describeImport(file, source))
      );

    expect(violations).toEqual([]);
  });

  it('keeps the packages apart: grammar never imports definitions, definitions only the grammar entry', () => {
    const violations = PACKAGES.flatMap((name) => {
      const packageDir = join(__dirname, name);

      return sourceFiles(packageDir).flatMap((file) =>
        importsOf(file)
          .filter(isRelative)
          .filter((source) => {
            const target = targetOf(file, source);

            if (isInside(packageDir, target)) {
              return false;
            }

            return name === 'grammar' || !isPackageEntry(target);
          })
          .map((source) => describeImport(file, source))
      );
    });

    expect(violations).toEqual([]);
  });
});
