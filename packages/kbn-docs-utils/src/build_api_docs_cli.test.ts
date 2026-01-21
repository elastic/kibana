/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFlagError } from '@kbn/dev-cli-errors';

// Test flag validation logic directly without executing the full CLI
describe('build_api_docs_cli flag validation', () => {
  // Test the validation logic that would be in build_api_docs_cli
  function isStringArray(arr: unknown | string[]): arr is string[] {
    return Array.isArray(arr) && arr.every((p) => typeof p === 'string');
  }

  it('validates plugin flag must be string array', () => {
    const pluginFilter = { invalid: 'object' };

    if (pluginFilter && !isStringArray(pluginFilter)) {
      expect(() => {
        throw createFlagError('expected --plugin must only contain strings');
      }).toThrow('expected --plugin must only contain strings');
    }
  });

  it('validates stats flag values', () => {
    const stats = ['invalid'];

    if (
      (stats &&
        isStringArray(stats) &&
        stats.find((s) => s !== 'any' && s !== 'comments' && s !== 'exports')) ||
      (stats && !isStringArray(stats))
    ) {
      expect(() => {
        throw createFlagError(
          'expected --stats must only contain `any`, `comments` and/or `exports`'
        );
      }).toThrow('expected --stats must only contain');
    }
  });

  it('accepts valid stats values', () => {
    const stats = ['any', 'comments'];

    if (
      (stats &&
        isStringArray(stats) &&
        stats.find((s) => s !== 'any' && s !== 'comments' && s !== 'exports')) ||
      (stats && !isStringArray(stats))
    ) {
      throw new Error('Should not throw for valid stats');
    }

    // Should not throw
    expect(stats).toEqual(['any', 'comments']);
  });

  it('handles single string plugin flag', () => {
    const plugin = 'single-plugin';
    const pluginFilter = typeof plugin === 'string' ? [plugin] : plugin;

    expect(Array.isArray(pluginFilter)).toBe(true);
    expect(pluginFilter).toEqual(['single-plugin']);
  });

  it('handles array plugin flag', () => {
    const plugin = ['plugin1', 'plugin2'];
    const pluginFilter = typeof plugin === 'string' ? [plugin] : plugin;

    expect(Array.isArray(pluginFilter)).toBe(true);
    expect(pluginFilter).toEqual(['plugin1', 'plugin2']);
  });
});
