/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-eval, no-new-func -- these tests check that code generation is blocked */

const ERROR_MESSAGE = 'Code generation from strings disallowed for this context';

const getConstructor = (fn: (...args: never[]) => unknown): FunctionConstructor =>
  Object.getPrototypeOf(fn).constructor;

describe('code generation from strings', () => {
  it('runs the worker with --disallow-code-generation-from-strings', () => {
    expect(process.execArgv).toContain('--disallow-code-generation-from-strings');
  });

  it.each([
    ['eval()', () => eval('1 + 1')],
    ['indirect eval()', () => (0, eval)('1 + 1')],
    ['new Function()', () => new Function('return 1')],
    ['Function()', () => Function('return 1')],
    ['a function constructor', () => (() => {}).constructor('return 1')],
    ['the AsyncFunction constructor', () => getConstructor(async () => {})('return 1')],
    ['the GeneratorFunction constructor', () => getConstructor(function* () {})('return 1')],
  ])('blocks %s', (_name, generate) => {
    expect(generate).toThrow(EvalError);
    expect(generate).toThrow(ERROR_MESSAGE);
  });

  // Vitest reads snapshot files with new Function() unless the pnpm patch in
  // patches/vitest@*.patch is applied, so this fails if the patch goes missing.
  it('reads existing snapshot files', () => {
    expect({ snapshot: 'read with node:vm' }).toMatchSnapshot();
  });
});
