/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getStepChipPalette } from './step_chip_palette';
import type { StepFamily } from '../step_icons';

// Proxy returns the property name as its value, so assertions read as the
// token name rather than an opaque colour string.
const mockTheme = {
  colors: new Proxy({}, { get: (_t, prop) => (typeof prop === 'string' ? prop : String(prop)) }),
} as any;

describe('getStepChipPalette', () => {
  describe('outcome overrides', () => {
    const families: StepFamily[] = ['trigger', 'flow', 'data', 'code', 'external', 'brand'];

    it('returns success tokens for every family on success', () => {
      for (const family of families) {
        const p = getStepChipPalette(mockTheme, family, 'success');
        expect(p).toEqual({
          fill: 'backgroundBaseSuccess',
          border: 'success',
          icon: 'success',
        });
      }
    });

    it('returns failure tokens for every family on failure', () => {
      for (const family of families) {
        const p = getStepChipPalette(mockTheme, family, 'failure');
        expect(p).toEqual({
          fill: 'backgroundBaseDanger',
          border: 'danger',
          icon: 'danger',
        });
      }
    });
  });

  describe('idle (outcome: none)', () => {
    it('trigger', () => {
      expect(getStepChipPalette(mockTheme, 'trigger', 'none')).toEqual({
        fill: 'backgroundBaseAccent',
        border: 'borderBaseAccent',
        icon: 'textAccent',
      });
    });

    it('flow', () => {
      expect(getStepChipPalette(mockTheme, 'flow', 'none')).toEqual({
        fill: 'backgroundBaseAccentSecondary',
        border: 'borderBaseAccentSecondary',
        icon: 'textAccentSecondary',
      });
    });

    it('data', () => {
      expect(getStepChipPalette(mockTheme, 'data', 'none')).toEqual({
        fill: 'backgroundBaseWarning',
        border: 'borderBaseWarning',
        icon: 'textWarning',
      });
    });

    it('code', () => {
      expect(getStepChipPalette(mockTheme, 'code', 'none')).toEqual({
        fill: 'backgroundBasePrimary',
        border: 'borderBasePrimary',
        icon: 'textPrimary',
      });
    });

    it('external', () => {
      expect(getStepChipPalette(mockTheme, 'external', 'none')).toEqual({
        fill: 'backgroundBaseSubdued',
        border: 'borderBaseSubdued',
        icon: 'textSubdued',
      });
    });

    it('brand (same subdued palette as external while idle)', () => {
      expect(getStepChipPalette(mockTheme, 'brand', 'none')).toEqual({
        fill: 'backgroundBaseSubdued',
        border: 'borderBaseSubdued',
        icon: 'textSubdued',
      });
    });
  });
});
