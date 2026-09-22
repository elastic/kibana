/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import hmrBoundaryLoader from './hmr_boundary_loader';

function runLoader(source: string, resourcePath: string = '/app/my_component.tsx'): string {
  const context = { resourcePath };
  return hmrBoundaryLoader.call(context, source);
}

describe('hmr_boundary_loader', () => {
  describe('non-React files (no $RefreshReg$)', () => {
    it('returns source unchanged for plain utility files', () => {
      const source = `
        export const add = (a, b) => a + b;
        export const subtract = (a, b) => a - b;
      `;
      expect(runLoader(source)).toBe(source);
    });

    it('returns source unchanged for empty files', () => {
      const source = '';
      expect(runLoader(source)).toBe(source);
    });

    it('returns source unchanged for files with only imports', () => {
      const source = `
        import { something } from './other';
        export const value = something;
      `;
      expect(runLoader(source)).toBe(source);
    });
  });

  describe('React files with $RefreshReg$ (component detection)', () => {
    it('injects HMR boundary for pure component files', () => {
      const source = `
        export const MyComponent = () => { return null; };
        $RefreshReg$(MyComponent, "MyComponent");
      `;
      const result = runLoader(source);
      expect(result).toContain('module.hot.accept()');
      expect(result).toContain('module.hot.dispose');
      expect(result).toContain('__kbnHmrActive');
      expect(result).toContain('__react_refresh_utils__');
    });

    it('does not include stale export warning for pure component files', () => {
      const source = `
        export const MyComponent = () => { return null; };
        $RefreshReg$(MyComponent, "MyComponent");
      `;
      const result = runLoader(source);
      expect(result).not.toContain('may be stale');
      expect(result).not.toContain('console.warn');
    });
  });

  describe('mixed-export files (component + non-component exports)', () => {
    it('injects HMR boundary with stale export warning', () => {
      const source = `
        export const DiscoverRouter = () => { return null; };
        export function getReadOnlyBadge() { return {}; }
        $RefreshReg$(DiscoverRouter, "DiscoverRouter");
      `;
      const result = runLoader(source);
      expect(result).toContain('module.hot.accept()');
      expect(result).toContain('console.warn');
      expect(result).toContain('getReadOnlyBadge');
      expect(result).toContain('may be stale in importing modules');
    });

    it('lists multiple non-component exports in warning', () => {
      const source = `
        export const MyComponent = () => { return null; };
        export const helperA = () => {};
        export const helperB = () => {};
        $RefreshReg$(MyComponent, "MyComponent");
      `;
      const result = runLoader(source);
      expect(result).toContain('"helperA"');
      expect(result).toContain('"helperB"');
    });

    it('truncates warning when more than 3 non-component exports', () => {
      const source = `
        export const MyComponent = () => { return null; };
        export const helperA = () => {};
        export const helperB = () => {};
        export const helperC = () => {};
        export const helperD = () => {};
        export const helperE = () => {};
        $RefreshReg$(MyComponent, "MyComponent");
      `;
      const result = runLoader(source);
      expect(result).toContain("' and ' + (__hmr_names.length - 3) + ' more'");
    });

    it('handles export list syntax', () => {
      const source = `
        const DiscoverRouter = () => { return null; };
        const getReadOnlyBadge = () => {};
        export { DiscoverRouter, getReadOnlyBadge };
        $RefreshReg$(DiscoverRouter, "DiscoverRouter");
      `;
      const result = runLoader(source);
      expect(result).toContain('getReadOnlyBadge');
      expect(result).toContain('may be stale');
    });

    it('handles export with "as" rename', () => {
      const source = `
        const _MyComponent = () => { return null; };
        const _helper = () => {};
        export { _MyComponent as MyComponent, _helper as helper };
        $RefreshReg$(_MyComponent, "MyComponent");
      `;
      const result = runLoader(source);
      expect(result).toContain('"helper"');
    });

    it('ignores __esModule in export detection', () => {
      const source = `
        export const __esModule = true;
        export const MyComponent = () => { return null; };
        $RefreshReg$(MyComponent, "MyComponent");
      `;
      const result = runLoader(source);
      expect(result).not.toContain('console.warn');
    });
  });

  describe('filename extraction', () => {
    it('extracts filename from resource path in warning', () => {
      const source = `
        export const MyComponent = () => { return null; };
        export const helper = () => {};
        $RefreshReg$(MyComponent, "MyComponent");
      `;
      const result = runLoader(source, '/path/to/discover_router.tsx');
      expect(result).toContain('discover_router.tsx');
    });

    it('handles Windows-style paths', () => {
      const source = `
        export const MyComponent = () => { return null; };
        export const helper = () => {};
        $RefreshReg$(MyComponent, "MyComponent");
      `;
      const result = runLoader(source, 'C:\\Users\\dev\\discover_router.tsx');
      expect(result).toContain('discover_router.tsx');
    });
  });

  describe('footer structure', () => {
    it('wraps all HMR code in module.hot guard', () => {
      const source = `
        export const MyComponent = () => { return null; };
        $RefreshReg$(MyComponent, "MyComponent");
      `;
      const result = runLoader(source);
      expect(result).toContain('if (module.hot) {');
    });

    it('only triggers enqueueUpdate on re-execution (not first load)', () => {
      const source = `
        export const MyComponent = () => { return null; };
        $RefreshReg$(MyComponent, "MyComponent");
      `;
      const result = runLoader(source);
      expect(result).toContain('if (module.hot.data) {');
      expect(result).toContain('enqueueUpdate');
    });

    it('includes the @kbn/rspack-optimizer boundary comment', () => {
      const source = `
        export const MyComponent = () => { return null; };
        $RefreshReg$(MyComponent, "MyComponent");
      `;
      const result = runLoader(source);
      expect(result).toContain('@kbn/rspack-optimizer HMR boundary');
    });
  });

  describe('multiple components in one file', () => {
    it('does not warn when all exports are components', () => {
      const source = `
        export const Header = () => { return null; };
        export const Footer = () => { return null; };
        $RefreshReg$(Header, "Header");
        $RefreshReg$(Footer, "Footer");
      `;
      const result = runLoader(source);
      expect(result).toContain('module.hot.accept()');
      expect(result).not.toContain('console.warn');
    });

    it('warns only about non-component exports', () => {
      const source = `
        export const Header = () => { return null; };
        export const Footer = () => { return null; };
        export const PAGE_SIZE = 25;
        $RefreshReg$(Header, "Header");
        $RefreshReg$(Footer, "Footer");
      `;
      const result = runLoader(source);
      expect(result).toContain('PAGE_SIZE');
      const namesMatch = result.match(/__hmr_names = (\[.*?\])/);
      expect(namesMatch).not.toBeNull();
      expect(namesMatch![1]).toBe('["PAGE_SIZE"]');
    });
  });
});
