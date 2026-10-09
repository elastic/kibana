/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as UiSharedDepsSrc from '@kbn/ui-shared-deps-src';
import { getExternals, isKeaReactReduxImport } from './externals';

/**
 * Rspack-specific externals that are NOT in UiSharedDepsSrc.externals.
 * Any addition here must be intentional and documented.
 */
const RSPACK_ONLY_EXTERNALS = ['node:crypto'];

describe('externals configuration', () => {
  const rspackExternals = getExternals();
  const sharedDepsExternals = UiSharedDepsSrc.externals as Record<string, string>;

  describe('bidirectional sync with kbn-ui-shared-deps-src', () => {
    it('should include every shared deps external with the same value', () => {
      const missing: string[] = [];
      const mismatched: Array<{ key: string; expected: string; actual: string }> = [];

      for (const [key, value] of Object.entries(sharedDepsExternals)) {
        if (!(key in rspackExternals)) {
          missing.push(key);
        } else if (rspackExternals[key] !== value) {
          mismatched.push({ key, expected: value, actual: rspackExternals[key] });
        }
      }

      expect(missing).toEqual([]);
      expect(mismatched).toEqual([]);
    });

    it('should only have expected rspack-specific additions', () => {
      const rspackOnly = Object.keys(rspackExternals).filter(
        (key) => !(key in sharedDepsExternals)
      );

      expect(rspackOnly.sort()).toEqual(RSPACK_ONLY_EXTERNALS.sort());
    });
  });

  describe('isKeaReactReduxImport', () => {
    it('returns true for react-redux imported from kea', () => {
      expect(isKeaReactReduxImport('/path/to/node_modules/kea/lib', 'react-redux')).toBe(true);
    });

    it('returns true with backslash separators (Windows)', () => {
      expect(isKeaReactReduxImport('C:\\project\\node_modules\\kea\\lib', 'react-redux')).toBe(
        true
      );
    });

    it('returns false for react-redux from non-kea context', () => {
      expect(isKeaReactReduxImport('/path/to/node_modules/other-pkg', 'react-redux')).toBe(false);
    });

    it('returns false for non-react-redux request from kea context', () => {
      expect(isKeaReactReduxImport('/path/to/node_modules/kea/lib', 'redux')).toBe(false);
    });

    it('returns false when context is undefined', () => {
      expect(isKeaReactReduxImport(undefined, 'react-redux')).toBe(false);
    });

    it('returns false when request is undefined', () => {
      expect(isKeaReactReduxImport('/path/to/node_modules/kea/lib', undefined)).toBe(false);
    });
  });

  describe('critical singleton externals are defined', () => {
    const criticalSingletons = [
      'react',
      'react-dom',
      '@emotion/react',
      '@emotion/cache',
      '@emotion/react/jsx-runtime',
      '@emotion/react/jsx-dev-runtime',
      'styled-components',
      'redux',
      'react-redux',
      '@reduxjs/toolkit',
    ];

    for (const moduleName of criticalSingletons) {
      it(`"${moduleName}" must be externalized (singleton)`, () => {
        expect(rspackExternals[moduleName]).toBeDefined();
        expect(rspackExternals[moduleName]).toContain('__kbnSharedDeps__');
      });
    }
  });
});
