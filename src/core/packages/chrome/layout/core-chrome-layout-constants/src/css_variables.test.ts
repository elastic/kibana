/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { layoutVar, layoutVarName } from './css_variables';

describe('CSS Variables', () => {
  describe('layoutVarName', () => {
    it('should generate layout variable names with --kbn-layout-- prefix', () => {
      expect(layoutVarName('banner.height')).toBe('--kbn-layout--banner-height');
      expect(layoutVarName('header.width')).toBe('--kbn-layout--header-width');
      expect(layoutVarName('navigation.top')).toBe('--kbn-layout--navigation-top');
      expect(layoutVarName('application.bottom')).toBe('--kbn-layout--application-bottom');
    });

    it('should generate application variable names with --kbn-application-- prefix', () => {
      expect(layoutVarName('application.topBar.height')).toBe('--kbn-application--top-bar-height');
      expect(layoutVarName('application.bottomBar.width')).toBe(
        '--kbn-application--bottom-bar-width'
      );
      expect(layoutVarName('application.content.left')).toBe('--kbn-application--content-left');
    });

    it('should convert dot notation to kebab-case correctly', () => {
      // Verify the dot notation to kebab-case conversion
      expect(layoutVarName('application.topBar.height')).not.toContain('topBar');
      expect(layoutVarName('application.topBar.height')).toContain('top-bar-height');
    });

    it('should convert camelCase properties to kebab-case', () => {
      expect(layoutVarName('application.marginBottom')).toBe(
        '--kbn-layout--application-margin-bottom'
      );
      expect(layoutVarName('application.marginRight')).toBe(
        '--kbn-layout--application-margin-right'
      );
      expect(layoutVarName('header.marginBottom')).toBe('--kbn-layout--header-margin-bottom');
    });

    it('should convert camelCase properties in application variables', () => {
      expect(layoutVarName('application.topBar.marginBottom')).toBe(
        '--kbn-application--top-bar-margin-bottom'
      );
    });
  });

  describe('layoutVar', () => {
    it('should wrap layout variables in var() syntax', () => {
      expect(layoutVar('banner.height')).toBe('var(--kbn-layout--banner-height)');
      expect(layoutVar('header.width')).toBe('var(--kbn-layout--header-width)');
    });

    it('should wrap application variables in var() syntax', () => {
      expect(layoutVar('application.topBar.height')).toBe('var(--kbn-application--top-bar-height)');
      expect(layoutVar('application.content.left')).toBe('var(--kbn-application--content-left)');
    });

    it('should include fallback values when provided', () => {
      expect(layoutVar('banner.height', '50px')).toBe('var(--kbn-layout--banner-height, 50px)');
      expect(layoutVar('application.topBar.height', '40px')).toBe(
        'var(--kbn-application--top-bar-height, 40px)'
      );
    });

    it('should use layoutVarName internally for consistency', () => {
      // Test that layoutVar produces the same variable name as layoutVarName
      const varName = 'banner.height';
      const expectedVarName = layoutVarName(varName);
      const actualVarOutput = layoutVar(varName);

      expect(actualVarOutput).toBe(`var(${expectedVarName})`);
    });
  });
});
