/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { SourceMap } from 'node:module';
import transformer from '.';

const makeTransformOptions = (rootDir = process.cwd(), overrides = {}) => ({
  config: {
    rootDir,
    transform: {},
    transformIgnorePatterns: [],
  },
  instrument: false,
  supportsStaticESM: false,
  ...overrides,
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

  it('resolves dynamic mock names from the binding visible at the call site', () => {
    const code = getCode(`
      const modulePath = './real_module';
      jest.mock(modulePath, () => ({}));
      describe('x', () => { const modulePath = './wrong'; });
    `);

    expect(code).toMatch(/\.mock\(['"]\.\/real_module['"]/);
    expect(code).not.toMatch(/\.mock\(['"]\.\/wrong['"]/);
  });

  it('does not inline a dynamic mock name declared only in an inner scope', () => {
    const code = getCode(`
      jest.mock(modulePath, () => ({}));
      describe('x', () => { const modulePath = './wrong'; });
    `);

    expect(code).toContain('.mock(modulePath');
  });

  it('resolves dynamic mock names through enclosing scopes', () => {
    const code = getCode(`
      describe('x', () => {
        const modulePath = './value';
        jest.isolateModules(() => {
          jest.mock(modulePath, () => ({}));
        });
      });
    `);

    expect(code).toMatch(/\.mock\(['"]\.\/value['"]/);
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

  it('normalizes whitespace in multiline JSX string attributes before SWC', () => {
    const result = transformer.process(
      `export const message = (
  <FormattedMessage
    id="example.message"
    defaultMessage="First sentence.
      Second sentence."
  />
);
throw new Error('after');`,
      '/repo/message.tsx',
      makeTransformOptions()
    );
    const generatedLines = result.code.split('\n');
    const generatedLine = generatedLines.findIndex((line) => line.includes("new Error('after')"));
    const generatedColumn = generatedLines[generatedLine].indexOf('throw');
    const originalPosition = new SourceMap(JSON.parse(result.map)).findEntry(
      generatedLine,
      generatedColumn
    );

    expect(result.code).toContain('defaultMessage: "First sentence. Second sentence."');
    expect(result.code).not.toContain('First sentence.\\n');
    expect(result.code).toContain('jsxDEV');
    expect(originalPosition).toMatchObject({
      originalSource: '/repo/message.tsx',
      originalLine: 7,
      originalColumn: 0,
    });
  });

  it('delimits Emotion labels when CSS templates omit a trailing semicolon', () => {
    const code = getCode(
      `
        import { css } from '@emotion/react';
        export const noSemi = (width: number) => css\`width: ${'${width}'}px\`;
        export const plainNoSemi = css\`color: red\`;
        export const withSemi = (width: number) => css\`width: ${'${width}'}px;\`;
      `,
      '/repo/emotion.ts'
    );

    expect(code).toMatch(/"px",\s*";label:noSemi"/);
    expect(code).toMatch(/"color:red",\s*";label:plainNoSemi"/);
    expect(code).toMatch(/"px;",\s*"label:withSemi"/);
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

  it('keeps source map positions aligned after CommonJS compatibility rewrites', () => {
    const result = transformer.process(
      `export const value = 1;
export function boom() {
  const message = 'failure';
  throw new Error(message);
}
boom();`,
      '/repo/subject.ts',
      makeTransformOptions()
    );
    const generatedLines = result.code.split('\n');
    const generatedLine = generatedLines.findIndex((line) => line.includes('throw new Error')) + 1;
    const generatedColumn = generatedLines[generatedLine - 1].indexOf('throw');
    const originalPosition = new SourceMap(JSON.parse(result.map)).findEntry(
      generatedLine - 1,
      generatedColumn
    );

    expect(originalPosition).toMatchObject({
      originalSource: '/repo/subject.ts',
      originalLine: 3,
      originalColumn: 2,
    });
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

  it('uses Babel for enum members initialized from deep member access', () => {
    const code = getCode(`
      const CFG = { ID: { X: 'x' } } as const;
      export enum RuleType { Metric = CFG.ID.X }
      export const values = Object.values(RuleType);
    `);

    expect(code).not.toContain('RuleType[RuleType[');
    expect(code).toContain('RuleType["Metric"] = "x"');
  });

  it('uses Babel for enum members initialized from template literals', () => {
    const code = getCode(`
      const FEATURE_ID = 'workflowsManagement';
      export enum ApiActions {
        create = \`${'${FEATURE_ID}'}:create\`,
        read = \`${'${FEATURE_ID}'}:read\`,
      }
    `);

    expect(code).not.toContain('ApiActions[ApiActions[');
    expect(code).toContain('ApiActions["create"] = "workflowsManagement:create"');
    expect(code).toContain('ApiActions["read"] = "workflowsManagement:read"');
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
  });

  it('makes exports with dollar-sign names replaceable', () => {
    const code = getCode('export const theme$ = () => "real";');

    expect(code).toContain('Object.defineProperty(exports, "theme$"');
    expect(code).toContain('value: exports["theme$"], writable: true');
  });

  it('does not create exports from unrelated object getters', () => {
    const code = getCode(`
      const serverConfig = 1;
      const object = { get helper() { return serverConfig; } };
      export const value = object.helper;
    `);

    expect(code).not.toContain('Object.defineProperty(exports, "helper"');
    expect(code).toContain('Object.defineProperty(exports, "value"');
  });

  it('does not modify user defineProperty calls with export-helper parameter names', () => {
    const code = getCode(`
      const target = {};
      const to = {};
      Object.defineProperty(target, 'first', {
        enumerable: true,
        get() { return 1; },
      });
      Object.defineProperty(to, 'second', {
        enumerable: true,
        get() { return 2; },
      });
      export const value = target.first + to.second;
    `);

    expect(code).toMatch(
      /Object\.defineProperty\(target, ['"]first['"], \{\n\s+enumerable: true,\n\s+get \(\)/
    );
    expect(code).toMatch(
      /Object\.defineProperty\(to, ['"]second['"], \{\n\s+enumerable: true,\n\s+get \(\)/
    );
  });

  it('allows Jest to replace a named export with an attached comment', () => {
    const code = getCode(`
      // A comment, including a comma.
      export function useFetcher() {}
    `);

    expect(code).toContain('enumerable: true, configurable: true');
    expect(code).toContain('function(value)');
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

  it('keeps processAsync output in the requested module format', async () => {
    const commonJsResult = await transformer.processAsync(
      'export const value = 1;',
      '/repo/commonjs.ts',
      makeTransformOptions()
    );
    const esmResult = await transformer.processAsync(
      `const CFG = { ID: { X: 'x' } } as const;
       export enum RuleType { Metric = CFG.ID.X }`,
      '/repo/esm.ts',
      makeTransformOptions(process.cwd(), { supportsStaticESM: true })
    );

    expect(commonJsResult.code).toContain('Object.defineProperty(exports');
    expect(esmResult.code).toContain('export let RuleType');
    expect(esmResult.code).not.toContain('Object.defineProperty(exports');
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
