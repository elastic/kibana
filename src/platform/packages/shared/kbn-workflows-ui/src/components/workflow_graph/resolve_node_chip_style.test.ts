/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolveNodeChipStyle } from './resolve_node_chip_style';

const theme = {
  colors: {
    backgroundBaseAccent: 'accent-bg',
    borderBaseAccent: 'accent-border',
    textAccent: 'accent-text',
    backgroundBaseAccentSecondary: 'flow-bg',
    borderBaseAccentSecondary: 'flow-border',
    textAccentSecondary: 'flow-text',
    backgroundBaseWarning: 'data-bg',
    borderBaseWarning: 'data-border',
    textWarning: 'data-text',
    backgroundBasePrimary: 'code-bg',
    borderBasePrimary: 'code-border',
    textPrimary: 'code-text',
    backgroundBaseSubdued: 'neutral-bg',
    borderBaseSubdued: 'neutral-border',
    textSubdued: 'neutral-text',
    backgroundBaseSuccess: 'success-bg',
    borderBaseSuccess: 'success-border',
    textSuccess: 'success-text',
    backgroundBaseDanger: 'danger-bg',
    borderBaseDanger: 'danger-border',
    textDanger: 'danger-text',
    success: 'success-color',
    danger: 'danger-color',
  },
} as any;

const idle = { isSuccess: false, isFailed: false };
const success = { isSuccess: true, isFailed: false };
const failed = { isSuccess: false, isFailed: true };

describe('resolveNodeChipStyle', () => {
  describe('default (idle) category mapping', () => {
    it('uses accent tokens for trigger nodes', () => {
      const chip = resolveNodeChipStyle(theme, 'manual', true, idle);
      expect(chip).toEqual({
        background: 'accent-bg',
        border: 'accent-border',
        iconColor: 'accent-text',
        isBrand: false,
      });
    });

    it('uses accent tokens for TRIGGER_STEP_TYPES without the isTrigger flag', () => {
      const chip = resolveNodeChipStyle(theme, 'alert', false, idle);
      expect(chip.background).toBe('accent-bg');
      expect(chip.isBrand).toBe(false);
    });

    it('uses accent-secondary tokens for flow-control steps', () => {
      const chip = resolveNodeChipStyle(theme, 'if', false, idle);
      expect(chip.background).toBe('flow-bg');
      expect(chip.iconColor).toBe('flow-text');
    });

    it('uses warning tokens for data transformation steps', () => {
      const chip = resolveNodeChipStyle(theme, 'data.set', false, idle);
      expect(chip.background).toBe('data-bg');
      expect(chip.iconColor).toBe('data-text');
    });

    it('uses primary tokens for console/http code steps', () => {
      expect(resolveNodeChipStyle(theme, 'console', false, idle).background).toBe('code-bg');
      expect(resolveNodeChipStyle(theme, 'http', false, idle).background).toBe('code-bg');
    });

    it('uses primary tokens for AI steps', () => {
      const chip = resolveNodeChipStyle(theme, 'inference', false, idle);
      expect(chip.background).toBe('code-bg');
      expect(chip.isBrand).toBe(false);
    });

    it('uses subdued tokens for external/unknown connectors', () => {
      const chip = resolveNodeChipStyle(theme, 'slack', false, idle);
      expect(chip.background).toBe('neutral-bg');
      expect(chip.iconColor).toBe('neutral-text');
      expect(chip.isBrand).toBe(false);
    });

    it('uses a neutral chip with no icon tint for Elasticsearch brand steps', () => {
      const chip = resolveNodeChipStyle(theme, 'elasticsearch.search', false, idle);
      expect(chip.background).toBe('neutral-bg');
      expect(chip.iconColor).toBeUndefined();
      expect(chip.isBrand).toBe(true);
    });

    it('uses a neutral chip with no icon tint for Kibana brand steps', () => {
      const chip = resolveNodeChipStyle(theme, 'kibana.request', false, idle);
      expect(chip.isBrand).toBe(true);
      expect(chip.iconColor).toBeUndefined();
    });
  });

  describe('run / execution state', () => {
    it('recolors category chips on success', () => {
      const chip = resolveNodeChipStyle(theme, 'if', false, success);
      expect(chip.background).toBe('success-bg');
      expect(chip.border).toBe('success-color');
      expect(chip.iconColor).toBe('success-color');
      expect(chip.isBrand).toBe(false);
    });

    it('recolors category chips on failure', () => {
      const chip = resolveNodeChipStyle(theme, 'console', false, failed);
      expect(chip.background).toBe('danger-bg');
      expect(chip.border).toBe('danger-color');
      expect(chip.iconColor).toBe('danger-color');
    });

    it('recolors the brand tile on success but leaves the logo untinted', () => {
      const chip = resolveNodeChipStyle(theme, 'elasticsearch.search', false, success);
      expect(chip.background).toBe('success-bg');
      expect(chip.border).toBe('success-color');
      expect(chip.iconColor).toBeUndefined();
      expect(chip.isBrand).toBe(true);
    });

    it('recolors the brand tile on failure but leaves the logo untinted', () => {
      const chip = resolveNodeChipStyle(theme, 'kibana.request', false, failed);
      expect(chip.background).toBe('danger-bg');
      expect(chip.border).toBe('danger-color');
      expect(chip.iconColor).toBeUndefined();
      expect(chip.isBrand).toBe(true);
    });

    it('recolors the connector tile on success but leaves the service logo untinted', () => {
      const chip = resolveNodeChipStyle(theme, 'slack', false, success);
      expect(chip.background).toBe('success-bg');
      expect(chip.border).toBe('success-color');
      expect(chip.iconColor).toBe('neutral-text');
    });
  });
});
