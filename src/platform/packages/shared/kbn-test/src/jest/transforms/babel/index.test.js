/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('path');

describe('babel jest transformer cache key normalization', () => {
  const transformer = require('.');

  const SAMPLE_CODE = 'export const x = 1;';
  const SAMPLE_FILE = path.join(__dirname, 'sample.ts');

  function makeConfigString({ rootDir, roots }) {
    return JSON.stringify({
      rootDir,
      roots,
      // include a couple of other common jest fields to simulate real config
      testEnvironment: 'jsdom',
      transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
      },
    });
  }

  it('produces same cache key when only roots differ', () => {
    const cfgA = makeConfigString({ rootDir: process.cwd(), roots: ['a', 'b'] });
    const cfgB = makeConfigString({ rootDir: process.cwd(), roots: ['c'] });

    const keyA = transformer.getCacheKey(SAMPLE_CODE, SAMPLE_FILE, {
      configString: cfgA,
      config: { cwd: process.cwd(), rootDir: process.cwd() },
      instrument: false,
    });
    const keyB = transformer.getCacheKey(SAMPLE_CODE, SAMPLE_FILE, {
      configString: cfgB,
      config: { cwd: process.cwd(), rootDir: process.cwd() },
      instrument: false,
    });

    expect(keyA).toBe(keyB);
  });

  it('resolves rootDir so relative vs absolute do not differ', () => {
    const absRoot = process.cwd();
    const relRoot = path.relative(process.cwd(), absRoot) || '.';

    const cfgAbs = makeConfigString({ rootDir: absRoot, roots: [] });
    const cfgRel = makeConfigString({ rootDir: relRoot, roots: [] });

    const keyAbs = transformer.getCacheKey(SAMPLE_CODE, SAMPLE_FILE, {
      configString: cfgAbs,
      config: { cwd: process.cwd(), rootDir: absRoot },
      instrument: false,
    });
    const keyRel = transformer.getCacheKey(SAMPLE_CODE, SAMPLE_FILE, {
      configString: cfgRel,
      // Intentionally pass different rootDir shape (relative) to ensure normalization handles it
      config: { cwd: process.cwd(), rootDir: relRoot },
      instrument: false,
    });

    expect(keyAbs).toBe(keyRel);
  });
});
