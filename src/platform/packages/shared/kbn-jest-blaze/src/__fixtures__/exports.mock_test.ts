/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
/* eslint-disable @kbn/imports/no_unresolvable_imports */
// @ts-expect-error
import { reexportedFunction, reexportedConstant } from './reexport-package';
// @ts-expect-error
import { ExportedClass } from './modules/exported-class';
// @ts-expect-error
import { default as reexportedDefault } from './default-reexport';

// Test re-exports
// @ts-expect-error
export { someFunction } from './source-package';
// @ts-expect-error
export * from './wildcard-package';
// @ts-expect-error
export { pt } from './default-passthrough';

describe('Export and Re-export Tests', () => {
  test('should handle re-exported functions', () => {
    expect(typeof reexportedFunction).toBe('function');
    expect(reexportedFunction('test')).toBe('processed: test');
  });

  test('should handle re-exported constants', () => {
    expect(reexportedConstant).toBe('CONSTANT_VALUE');
  });

  test('should handle exported classes', () => {
    const instance = new ExportedClass('param');
    expect(instance).toBeInstanceOf(ExportedClass);
    expect(instance.getValue()).toBe('param');
  });

  test('should handle default re-exports', () => {
    expect(reexportedDefault).toBeDefined();
    expect(typeof reexportedDefault).toBe('object');
  });
});
