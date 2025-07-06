/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findProjectRoot, deepMerge } from './utils';

describe('utils', () => {
  describe('findProjectRoot', () => {
    it('should find root by package.json', () => {
      // This would need proper mocking in a real test
      const startDir = '/kibana/x-pack/plugins/security/public/components';
      const mockResolve = jest.spyOn(require, 'resolve');

      mockResolve.mockImplementation((id: string) => {
        if (id.includes('/kibana/package.json')) {
          return '/kibana/package.json';
        }
        throw new Error('Not found');
      });

      const root = findProjectRoot(startDir);
      expect(root).toBe('/kibana');

      mockResolve.mockRestore();
    });

    it('should fallback to process.cwd() if no root found', () => {
      const mockCwd = jest.spyOn(process, 'cwd').mockReturnValue('/default/dir');

      const root = findProjectRoot('/some/random/path');
      expect(root).toBe('/default/dir');

      mockCwd.mockRestore();
    });
  });

  describe('deepMerge', () => {
    it('should merge objects deeply', () => {
      const target = {
        a: 1,
        b: { c: 2, d: 3 },
        e: [1, 2],
      };

      const source = {
        b: { c: 4, f: 5 },
        e: [3, 4],
        g: 6,
      };

      const result = deepMerge(target, source as any);

      expect(result).toEqual({
        a: 1,
        b: { c: 4, d: 3, f: 5 },
        e: [1, 2, 3, 4],
        g: 6,
      });
    });

    it('should handle null and undefined values', () => {
      const target = { a: 1, b: null };
      const source = { b: undefined, c: null };

      const result = deepMerge(target, source as any);

      expect(result).toEqual({
        a: 1,
        b: undefined,
        c: null,
      });
    });
  });
});
