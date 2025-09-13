/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import transformer from '.';
import fs from 'fs';
import { spawnSync } from 'child_process';
import { REPO_ROOT } from '@kbn/repo-info';

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
  it('reuses transformed output across two configs', () => {
    // Ensure the data dir exists
    fs.mkdirSync(path.join(REPO_ROOT, 'data'), { recursive: true });

    // Use the same directory the transformer uses
    const cacheDir = path.join(REPO_ROOT, 'data', 'jest-cache');

    // Create a temp dir to hold the test files
    const tmpDir = fs.mkdtempSync(path.join(REPO_ROOT, 'data', 'jest-dedupe-'));

    // Test module that requires transformation
    const srcFile = path.join(tmpDir, 'sample.ts');

    // Test module that requires transformation
    fs.writeFileSync(srcFile, 'export const VALUE:number = 42;', 'utf8');

    // Create a Jest test that imports the module
    const testFile = path.join(tmpDir, 'sample.test.ts');

    // Create a Jest test that imports the module
    fs.writeFileSync(
      testFile,
      `import { VALUE } from './sample';
      
      it('should validate if a module can be imported', () => {
        expect(VALUE).toBe(42); 
      });
      `,
      'utf8'
    );

    // File that will hold a counter of how many times the transformer was invoked
    const counterFile = path.join(tmpDir, 'transform-count.txt');

    fs.writeFileSync(counterFile, '0', 'utf8');

    if (fs.existsSync(cacheDir)) {
      for (const e of fs.readdirSync(cacheDir)) {
        fs.rmSync(path.join(cacheDir, e), { recursive: true, force: true });
      }
    }

    // Wrapper transformer increments a counter only when transforming the source module (not the test file)
    const realTransformerPath = path.join(
      REPO_ROOT,
      'src/platform/packages/shared/kbn-test/src/jest/transforms/babel/index.js'
    );
    const wrapperPath = path.join(tmpDir, 'wrapper-transformer.js');

    // Create a custom transformer that wraps the real one and increments a counter
    // we only want to count transformations of the source file, not the test file
    fs.writeFileSync(
      wrapperPath,
      `
const fs = require('fs');
const real = require(${JSON.stringify(realTransformerPath)});
const counterFile = ${JSON.stringify(counterFile)};
module.exports = { 
  ...real,
  process(src, filename, ...rest) {  
    if (filename && filename.endsWith('sample.ts')) {
      try { 
        const c = parseInt(fs.readFileSync(counterFile, 'utf8') ,10) || 0;

        fs.writeFileSync(counterFile, String(c+1));
      } catch(_){
      }
    }
  return real.process(src, filename, ...rest);
}};`,
      'utf8'
    );

    const base = {
      rootDir: tmpDir,
      cacheDirectory: cacheDir,
      testEnvironment: 'node',
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      transform: { '^.+\\.(t|j)sx?$': wrapperPath },
    };

    const conf1 = { ...base, testTimeout: 10000 };
    const conf2 = { ...base, testTimeout: 12000 }; // should not affect cache key

    runInlineJest(conf1, testFile);
    runInlineJest(conf2, testFile);

    const count = parseInt(fs.readFileSync(counterFile, 'utf8'), 10);

    expect(count).toBe(1); // only first run should invoke transformer for source file
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
    throw new Error(`Jest run failed (${res.status})\nstdout=${res.stdout}\nstderr=${res.stderr}`);
  }
}
