/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { runInNewContext } from 'node:vm';
import { transformSync } from '@swc/core';
import type { Options } from '@swc/core';
import { getNodeRegisterSwcConfig } from './node_register';
import { getNodeSwcConfig } from './node';

const configurations = [
  {
    name: 'runtime',
    create: (source: string): Options => getNodeRegisterSwcConfig('/repo/example.ts', { source }),
  },
  {
    name: 'production',
    create: (source: string): Options =>
      getNodeSwcConfig('/repo/example.ts', { production: true, source }),
  },
];

const evaluate = <Exports extends object>(source: string, config: Options) => {
  const exports = {} as Exports;
  const loads: string[] = [];
  const read = jest.fn(() => 42);
  let failNext = false;
  const requireModule = (specifier: string): object => {
    if (specifier.startsWith('@swc/helpers/')) return jest.requireActual(specifier);
    loads.push(specifier);
    if (failNext) {
      failNext = false;
      throw new Error('Dependency initialization failed');
    }
    return { read };
  };
  runInNewContext(transformSync(source, config).code, { exports, require: requireModule });
  return { exports, loads, read, failNextLoad: () => (failNext = true) };
};

describe.each(configurations)('$name imports', ({ create }) => {
  it('runs explicit side effects eagerly and loads relative helpers once on concurrent first use', async () => {
    const source = `
      import './side_effect';
      import { read } from './dependency';
      export const invoke = () => read();
    `;
    const result = evaluate<{ invoke: () => number }>(source, create(source));
    expect(result.loads).toEqual(['./side_effect']);
    expect(
      await Promise.all(Array.from({ length: 20 }, async () => result.exports.invoke()))
    ).toEqual(Array.from({ length: 20 }, () => 42));
    expect(result.loads).toEqual(['./side_effect', './dependency']);
    expect(result.read).toHaveBeenCalledTimes(20);
  });

  it('retries dependency initialization after a failed first use', () => {
    const source = `import { read } from './dependency'; export const invoke = () => read();`;
    const result = evaluate<{ invoke: () => number }>(source, create(source));
    result.failNextLoad();
    expect(result.exports.invoke).toThrow('Dependency initialization failed');
    expect(result.exports.invoke()).toBe(42);
    expect(result.exports.invoke()).toBe(42);
    expect(result.loads).toEqual(['./dependency', './dependency']);
  });

  it.each([
    `import './dependency'; import { read } from './dependency'; export const invoke = () => read();`,
    `import './dependency'; export { read as invoke } from './dependency';`,
  ])('preserves a side-effect import when the same dependency also provides bindings', (source) => {
    const result = evaluate<{ invoke: () => number }>(source, create(source));
    expect(result.loads).toEqual(['./dependency']);
    expect(result.exports.invoke()).toBe(42);
    expect(result.loads).toEqual(['./dependency']);
  });

  it('loads a namespace import on first use', () => {
    const source = `import * as dependency from './dependency'; export const invoke = () => dependency.read();`;
    const result = evaluate<{ invoke: () => number }>(source, create(source));
    expect(result.loads).toEqual([]);
    expect(result.exports.invoke()).toBe(42);
    expect(result.loads).toEqual(['./dependency']);
  });

  it('preserves namespace re-export values', () => {
    const source = `export * as namespace from './dependency';`;
    const result = evaluate<{ namespace: { read: () => number } }>(source, create(source));
    expect(result.exports.namespace.read()).toBe(42);
  });

  it('keeps namespace re-exports eager while deferring unrelated bindings', () => {
    const source = `
      export * as namespace from './dependency';
      import { read } from './other';
      export const invoke = () => read();
    `;
    const result = evaluate<{ namespace: { read: () => number }; invoke: () => number }>(
      source,
      create(source)
    );
    expect(result.loads).toEqual(['./dependency']);
    expect(result.exports.namespace.read()).toBe(42);
    expect(result.exports.invoke()).toBe(42);
    expect(result.loads).toEqual(['./dependency', './other']);
  });

  it('loads named re-exports on access and preserves their identity', () => {
    const source = `export { read } from './dependency';`;
    const result = evaluate<{ read: () => number }>(source, create(source));
    expect(result.loads).toEqual([]);
    expect(result.exports.read).toBe(result.read);
    expect(result.exports.read).toBe(result.read);
    expect(result.loads).toEqual(['./dependency']);
  });

  it('keeps star re-exports complete', () => {
    const source = `export * from './dependency';`;
    const result = evaluate<{ read: () => number }>(source, create(source));
    expect(Object.keys(result.exports)).toEqual(['read']);
    expect(result.exports.read()).toBe(42);
  });
});
