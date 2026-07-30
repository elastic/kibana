/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import transformer from '.';

const makeTransformOptions = (rootDir = process.cwd()) => ({
  config: {
    rootDir,
    transform: {},
    transformIgnorePatterns: [],
  },
  instrument: false,
  supportsStaticESM: false,
});

const getCode = (source, filename = '/repo/example.ts') => {
  const result = transformer.process(source, filename, makeTransformOptions());
  return typeof result === 'string' ? result : result.code;
};

describe('SWC Jest transformer', () => {
  it('uses Babel to transform TypeScript and hoist Jest mocks', () => {
    const code = getCode(`
      import { value } from './value';
      jest.mock('./value');
      const answer: number = value;
      export { answer };
    `);

    expect(code).not.toContain(': number');
    expect(code.indexOf('.mock("./value")')).toBeLessThan(code.indexOf('require("./value")'));
  });

  it('does not hoist a mock with a variable module name above its declaration', () => {
    const code = getCode(`
      const moduleName = './value';
      jest.mock(moduleName, () => ({ value: jest.requireActual(moduleName).value }));
    `);

    const mockIndex = code.indexOf('.mock(');
    expect(code.slice(mockIndex, mockIndex + 40)).toMatch(/\.mock\(['"]\.\/value['"]/);
    expect(code.indexOf('const moduleName')).toBeLessThan(mockIndex);
  });

  it('hoists safe constants used by a mock factory with the mock', () => {
    const code = getCode(`
      const Component = () => null;
      jest.mock('./component', () => ({ Component }));
      import { rendered } from './component';
      export { rendered };
    `);

    const mockIndex = code.indexOf('.mock(');
    expect(code.indexOf('const Component')).toBeLessThan(mockIndex);
    expect(mockIndex).toBeLessThan(code.indexOf('require("./component")'));
  });

  it('transforms dynamic imports for the CommonJS Jest runtime', () => {
    const code = getCode(`export const load = () => import('./value');`);

    expect(code).toContain('require("./value")');
  });

  it('keeps source locations without SWC name mappings', () => {
    const result = transformer.process(
      'export const Component = () => null;',
      '/repo/example.tsx',
      makeTransformOptions()
    );
    const sourceMap = JSON.parse(result.map);

    expect(sourceMap.sources).toContain('/repo/example.tsx');
    expect(sourceMap.names).toEqual([]);
    expect(sourceMap.mappings).not.toBe('');
  });

  it('uses Babel for the lazyObject compile-time macro', () => {
    const code = getCode(`
      import { lazyObject } from '@kbn/lazy-object';
      export const value = lazyObject({ answer: computeAnswer() });
    `);

    expect(code).toContain('createLazyObjectFromAnnotations');
    expect(code).toContain('annotateLazy');
  });

  it('uses Babel for enum members initialized from string constants', () => {
    const code = getCode(`
      const METRIC_ID = 'metric';
      export enum RuleType { Metric = METRIC_ID }
      export const values = Object.values(RuleType);
    `);

    expect(code).not.toContain('RuleType[RuleType[');
    expect(code).toContain('RuleType["Metric"] = "metric"');
  });

  it('preserves add-module-exports behavior for a sole default export', () => {
    const code = getCode('export default 42;');

    expect(code).toContain('module.exports = exports.default;');
  });

  it('preserves add-module-exports behavior when the default export has a comment', () => {
    const code = getCode(`
      const value = 42;
      // eslint-disable-next-line import/no-default-export
      export default value;
    `);

    expect(code).toContain('module.exports = exports.default;');
    expect(code).not.toContain('value: exports["default"]');
  });

  it('keeps the exports object when default and named exports are combined', () => {
    const code = getCode('export default 42; export const answer = 42;');

    expect(code).not.toContain('module.exports = exports.default;');
    expect(code).toContain('get answer');
  });

  it('keeps the exports object when a default export is combined with export star', () => {
    const code = getCode(`export * from './value'; export default 42;`);

    expect(code).not.toContain('module.exports = exports.default;');
  });

  it('allows Jest to replace named exports with spies', () => {
    const code = getCode('export function useFetcher() {}');

    expect(code).toContain('enumerable: true, configurable: true');
    expect(code).toContain('function(value)');
    expect(code).toContain('value: exports["useFetcher"], writable: true');
  });

  it('allows Jest to replace a named export with an attached comment', () => {
    const code = getCode(`
      // A comment, including a comma.
      export function useFetcher() {}
    `);

    expect(code).toContain('enumerable: true, configurable: true');
    expect(code).toContain('value: exports["useFetcher"], writable: true');
  });

  it('keeps mutable and re-exported bindings as live getters', () => {
    const code = getCode(`
      export let mutableValue = 1;
      export { externalValue } from './value';
    `);

    expect(code).not.toContain('value: exports["mutableValue"]');
    expect(code).not.toContain('value: exports["externalValue"]');
  });

  it('allows Jest to replace export-star bindings with spies', () => {
    const code = getCode(`export * from './value';`);

    expect(code).not.toContain('@swc/helpers/_/_export_star');
    expect(code).toContain('enumerable: true, configurable: true');
  });

  it('returns undefined when a circular dependency reads an uninitialized export', () => {
    const code = getCode(`
      export const first = 1;
      export const value = require('./cycle').value;
    `);

    expect(code).toContain('if (error instanceof ReferenceError) return undefined;');
  });

  it('returns stable cache keys and varies them with relevant inputs', () => {
    const options = makeTransformOptions();
    const first = transformer.getCacheKey('export const value = 1;', __filename, options);

    expect(first).toMatch(/^[a-f0-9]{32}$/);
    expect(transformer.getCacheKey('export const value = 1;', __filename, options)).toBe(first);
    expect(transformer.getCacheKey('export const value = 2;', __filename, options)).not.toBe(first);
    expect(
      transformer.getCacheKey(
        'export const value = 1;',
        Path.join(process.cwd(), 'other.ts'),
        options
      )
    ).not.toBe(first);
  });
});
