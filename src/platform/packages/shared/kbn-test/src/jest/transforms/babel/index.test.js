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
import transformer from '.';
import { spawnSync } from 'child_process';
import { REPO_ROOT } from '@kbn/repo-info';
import * as fastGlob from 'fast-glob';

// Minimal transformOptions passed to getCacheKey. Jest provides a large object,
// but for our purposes we only need rootDir and a couple of transform fields
// that are accounted for in the transformer cache key computation.
function makeTransformOptions(rootDir) {
  return {
    config: {
      rootDir,
      // Match shape used by serializeJestTransformBits
      transform: {},
      transformIgnorePatterns: [],
    },
  };
}

describe('transformer cache key', () => {
  const rootDir = process.cwd();

  it('cache key: returns stable 32-char hex and varies with inputs', () => {
    const opts = makeTransformOptions(rootDir);

    const k1 = transformer.getCacheKey('console.log("a")', __filename, opts);
    expect(typeof k1).toBe('string');
    expect(k1).toHaveLength(32);
    expect(/^[a-f0-9]+$/.test(k1)).toBe(true);

    const k2 = transformer.getCacheKey('console.log("b")', __filename, opts);
    expect(k2).not.toBe(k1);

    const fakePath = path.join(rootDir, 'some', 'virtual', 'file.ts');
    const k3 = transformer.getCacheKey('console.log("a")', fakePath, opts);
    expect(k3).not.toBe(k1);

    // Same inputs produce the same key
    const k1b = transformer.getCacheKey('console.log("a")', __filename, opts);
    expect(k1b).toBe(k1);
  });
});

// Re-implemented integration test verifying that the same file transformed under
// two Jest configs (differing only in a non-cache-key option) only runs the
// transformer once by leveraging the shared cache directory.

describe('jest CLI cache deduplication', () => {
  // Use the same directory the transformer uses
  const cacheDirectory = path.join(REPO_ROOT, 'data', 'jest-cache');

  it('reuses transformed output across two configs', async () => {
    // Ensure the data dir exists
    fs.mkdirSync(path.join(REPO_ROOT, 'data'), { recursive: true });

    // Create a temp dir to hold the test files
    const tmpDir = fs.mkdtempSync(path.join(REPO_ROOT, 'data', 'kbn-jest-cache-dedupe-'));

    // Test module that requires transformation (uses a distinctive basename so we can identify cache artifacts)
    fs.writeFileSync(
      path.join(tmpDir, 'foo_foo_foo.ts'),
      'export const VALUE:number = 42;',
      'utf8'
    );

    // Create a Jest test that imports the module
    const testFile = path.join(tmpDir, 'foo_foo_foo.test.ts');

    // Create a Jest test that imports the module
    fs.writeFileSync(
      testFile,
      `import { VALUE } from './foo_foo_foo';
it('should validate if a module can be imported', () => {
  expect(VALUE).toBe(42);
});
`,
      'utf8'
    );

    const base = {
      rootDir: tmpDir,
      cacheDirectory,
      testEnvironment: 'node',
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      transform: { '^.+\\.(t|j)sx?$': require.resolve('./index.js') },
    };

    const conf1 = { ...base, testTimeout: 10000 };
    const conf2 = { ...base, testTimeout: 12000 }; // should not affect cache key

    runInlineJest(conf1, testFile);

    const firstFiles = fastGlob.sync(path.join(cacheDirectory, '**', 'foo_foo_foo_*'));

    expect(firstFiles.length).toBeGreaterThan(0); // something was cached

    runInlineJest(conf2, testFile);

    const secondFiles = fastGlob.sync(path.join(cacheDirectory, '**', 'foo_foo_foo_*'));

    // Compare file sets
    expect(secondFiles).toEqual(firstFiles);
  });

  it('does not reuse cache when a different rootDir is passed', () => {
    const tempA = fs.mkdtempSync(path.join(REPO_ROOT, 'data', 'kbn-jest-cache-rootA-'));
    fs.writeFileSync(path.join(tempA, 'baz_baz_baz.ts'), 'export const X:number = 1;', 'utf8');

    const testA = path.join(tempA, 'baz_baz_baz.test.ts');

    fs.writeFileSync(
      testA,
      `import { X } from './baz_baz_baz';
it('A root test', () => {
  expect(X).toBe(1);
});`,
      'utf8'
    );

    const configA = {
      rootDir: tempA,
      cacheDirectory,
      testEnvironment: 'node',
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      transform: { '^.+\\.(t|j)sx?$': require.resolve('./index.js') },
    };

    runInlineJest(configA, testA);

    const afterA = fastGlob.sync(path.join(cacheDirectory, '**', 'baz_baz_baz_*')).sort();

    expect(afterA.length).toBeGreaterThan(0); // produced at least one cached transform

    // Second temporary project with different rootDir but identical source/test content
    const tempB = fs.mkdtempSync(path.join(REPO_ROOT, 'data', 'kbn-jest-cache-rootB-'));

    fs.writeFileSync(path.join(tempB, 'baz_baz_baz.ts'), 'export const X:number = 1;', 'utf8');

    const testB = path.join(tempB, 'baz_baz_baz.test.ts');

    fs.writeFileSync(
      testB,
      `import { X } from './baz_baz_baz';
it('B root test', () => {
  expect(X).toBe(1);
});`,
      'utf8'
    );

    const configB = {
      rootDir: tempB,
      cacheDirectory,
      testEnvironment: 'node',
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      transform: { '^.+\\.(t|j)sx?$': require.resolve('./index.js') },
    };

    runInlineJest(configB, testB);

    const afterB = fastGlob.sync(path.join(cacheDirectory, '**', 'baz_baz_baz*'));

    // Expect additional cache entries (new rootDir => different cache key)
    expect(afterB.length).toBeGreaterThan(afterA.length);

    // And ensure sets differ
    expect(afterB).not.toEqual(afterA);
  });

  afterAll(() => {
    // Cleanup
    const matches = fastGlob.sync([
      path.join(cacheDirectory, '**', 'foo_foo_foo*'),
      path.join(cacheDirectory, '**', 'baz_baz_baz*'),
    ]);

    const dirs = new Set(matches.map((f) => path.dirname(f)));

    // Remove the files' parent directories (recursively)
    for (const d of dirs) {
      try {
        fs.rmSync(d, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });
});

function runInlineJest(inlineConfig, testFile) {
  const res = spawnSync(
    process.execPath,
    [
      path.join(REPO_ROOT, 'scripts/jest.js'),
      '--config',
      JSON.stringify(inlineConfig),
      testFile,
      '--runTestsByPath',
    ],
    { cwd: REPO_ROOT, env: { ...process.env }, encoding: 'utf8' }
  );

  if (res.error) throw res.error;

  if (res.status !== 0) {
    throw new Error(`Jest run failed (${res.status})
  stdout: ${res.stdout}
  stderr: ${res.stderr}
`);
  }
}
