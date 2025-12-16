/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('path');
const babel = require('@babel/core');
const { buildBarrelIndex } = require('../scanner');

const FIXTURES_DIR = path.join(__dirname, '..', '__fixtures__');

describe('barrel transform plugin', () => {
  let barrelIndex;

  beforeAll(async () => {
    barrelIndex = await buildBarrelIndex(FIXTURES_DIR);
  });

  it('builds barrel index correctly', () => {
    // Verify the index was built with expected barrel files
    const barrelPaths = Object.keys(barrelIndex);
    expect(barrelPaths.length).toBeGreaterThan(0);

    // Check basic barrel
    const basicBarrel = barrelPaths.find((p) => p.includes('barrel_basic/index.ts'));
    expect(basicBarrel).toBeDefined();
    expect(barrelIndex[basicBarrel].exports.Foo).toBeDefined();
    expect(barrelIndex[basicBarrel].exports.Foo.type).toBe('named');
  });

  it('transforms basic named import from barrel', () => {
    const input = `import { Foo } from './barrel_basic';`;
    const result = transform(input, path.join(FIXTURES_DIR, 'test.ts'), barrelIndex);

    expect(result.code).toContain('barrel_basic/foo');
    expect(result.code).not.toMatch(/from ['"]\.\/barrel_basic['"]/);
  });

  it('transforms aliased import from barrel', () => {
    const input = `import { Foo as MyFoo } from './barrel_basic';`;
    const result = transform(input, path.join(FIXTURES_DIR, 'test.ts'), barrelIndex);

    expect(result.code).toContain('barrel_basic/foo');
    expect(result.code).toContain('MyFoo');
  });

  it('transforms default export through barrel', () => {
    const input = `import { App } from './barrel_default';`;
    const result = transform(input, path.join(FIXTURES_DIR, 'test.ts'), barrelIndex);

    expect(result.code).toContain('barrel_default/app');
  });

  it('transforms export * through barrel', () => {
    const input = `import { helper } from './barrel_star';`;
    const result = transform(input, path.join(FIXTURES_DIR, 'test.ts'), barrelIndex);

    expect(result.code).toContain('barrel_star/utils');
  });

  it('transforms multiple exports from export * barrel', () => {
    const input = `import { helper, anotherHelper } from './barrel_star';`;
    const result = transform(input, path.join(FIXTURES_DIR, 'test.ts'), barrelIndex);

    expect(result.code).toContain('barrel_star/utils');
    expect(result.code).toContain('helper');
    expect(result.code).toContain('anotherHelper');
  });

  it('handles nested barrel files', () => {
    const input = `import { Sub } from './barrel_nested';`;
    const result = transform(input, path.join(FIXTURES_DIR, 'test.ts'), barrelIndex);

    // Should resolve through nested barrels to the sub/index.ts barrel
    expect(result.code).toContain('sub');
  });

  it('leaves non-barrel imports unchanged', () => {
    const input = `import React from 'react';`;
    const result = transform(input, path.join(FIXTURES_DIR, 'test.ts'), barrelIndex);

    expect(result.code).toContain(`from 'react'`);
  });

  it('leaves absolute node_modules imports unchanged', () => {
    const input = `import { useState } from 'react';`;
    const result = transform(input, path.join(FIXTURES_DIR, 'test.ts'), barrelIndex);

    expect(result.code).toContain(`from 'react'`);
  });

  it('is a no-op when barrelIndex is not provided', () => {
    const input = `import { Foo } from './barrel_basic';`;
    const result = transform(input, path.join(FIXTURES_DIR, 'test.ts'), null);

    expect(result.code).toContain(`from './barrel_basic'`);
  });

  it('is a no-op when barrelIndex is undefined', () => {
    const input = `import { Foo } from './barrel_basic';`;
    const result = transform(input, path.join(FIXTURES_DIR, 'test.ts'), undefined);

    expect(result.code).toContain(`from './barrel_basic'`);
  });

  it('handles namespace imports by leaving them unchanged', () => {
    const input = `import * as Basic from './barrel_basic';`;
    const result = transform(input, path.join(FIXTURES_DIR, 'test.ts'), barrelIndex);

    // Namespace imports cannot be transformed, should remain as-is
    expect(result.code).toContain(`from './barrel_basic'`);
  });

  it('handles mixed imports with some not in barrel', () => {
    // Assuming NonExistent is not exported from barrel_basic
    const input = `import { Foo, NonExistent } from './barrel_basic';`;
    const result = transform(input, path.join(FIXTURES_DIR, 'test.ts'), barrelIndex);

    // Foo should be transformed, NonExistent should stay with original import
    expect(result.code).toContain('barrel_basic/foo');
    expect(result.code).toContain('NonExistent');
    expect(result.code).toContain('./barrel_basic');
  });

  it('produces serializable barrel index', () => {
    // Verify the index can be serialized and deserialized without loss
    const serialized = JSON.stringify(barrelIndex);
    const deserialized = JSON.parse(serialized);

    expect(deserialized).toEqual(barrelIndex);
  });
});

function transform(code, filename, barrelIndex) {
  return babel.transformSync(code, {
    filename,
    // Use minimal parser options to just run the plugin without removing imports
    parserOpts: {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    },
    plugins: [[require.resolve('../index.js'), { barrelIndex }]],
    babelrc: false,
  });
}
