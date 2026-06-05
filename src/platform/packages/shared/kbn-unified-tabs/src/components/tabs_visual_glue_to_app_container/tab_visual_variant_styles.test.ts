/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  shouldApplyTabsBarGlobalChromeStyles,
  getTabsBarWithBackgroundStyles,
} from './tab_visual_variant_styles';

describe('tab visual variant styles', () => {
  describe('shouldApplyTabsBarGlobalChromeStyles', () => {
    it('should apply global chrome styles only for appContainer', () => {
      expect(shouldApplyTabsBarGlobalChromeStyles('appContainer')).toBe(true);
      expect(shouldApplyTabsBarGlobalChromeStyles('inlineAppHeader')).toBe(false);
    });
  });

  describe('getTabsBarWithBackgroundStyles', () => {
    it('should use transparent background for inlineAppHeader', () => {
      const styles = getTabsBarWithBackgroundStyles('inlineAppHeader', {
        colors: { lightestShade: '#f5f7fa' },
      } as Parameters<typeof getTabsBarWithBackgroundStyles>[1]);

      expect(String(styles)).toContain('transparent');
    });

    it('should use lightestShade background for appContainer', () => {
      const styles = getTabsBarWithBackgroundStyles('appContainer', {
        colors: { lightestShade: '#f5f7fa' },
      } as Parameters<typeof getTabsBarWithBackgroundStyles>[1]);

      expect(String(styles)).toContain('#f5f7fa');
    });
  });
});
