/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MAX_CONTROLS_GROUP_SIZE } from '@kbn/controls-constants';
import { MAX_PANELS } from '../../common/constants';
import { validatePanelLimits } from './panel_limit_validator';

const makePanels = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `panel-${i}`,
    type: 'testPanel',
    grid: { x: 0, y: i, w: 1, h: 1 },
    config: {},
  }));

describe('validatePanelLimits', () => {
  it('returns valid state when within all limits', () => {
    const result = validatePanelLimits({
      panels: makePanels(2),
      pinned_panels: [],
    });

    expect(result.isValid).toBe(true);
    expect(result.sectionViolations).toHaveLength(0);
    expect(result.topLevel).toEqual({ count: 2, max: MAX_PANELS, exceeded: false });
    expect(result.pinnedPanels).toEqual({
      count: 0,
      max: MAX_CONTROLS_GROUP_SIZE,
      exceeded: false,
    });
  });

  it('treats exactly-100 boundary as valid', () => {
    const result = validatePanelLimits({
      panels: makePanels(MAX_PANELS),
      pinned_panels: Array.from({ length: MAX_CONTROLS_GROUP_SIZE }, () => ({
        id: 'control',
        type: 'options_list_control',
        width: 'medium',
        grow: false,
        config: {},
      })),
    });

    expect(result.isValid).toBe(true);
  });

  it('detects top-level overflow', () => {
    const result = validatePanelLimits({
      panels: makePanels(MAX_PANELS + 1),
      pinned_panels: [],
    });

    expect(result.isValid).toBe(false);
    expect(result.topLevel.exceeded).toBe(true);
  });

  it('detects pinned-panels overflow', () => {
    const result = validatePanelLimits({
      panels: makePanels(0),
      pinned_panels: Array.from({ length: MAX_CONTROLS_GROUP_SIZE + 1 }, () => ({
        id: 'control',
        type: 'options_list_control',
        width: 'medium',
        grow: false,
        config: {},
      })),
    });

    expect(result.isValid).toBe(false);
    expect(result.pinnedPanels.exceeded).toBe(true);
  });

  it('detects section overflow and includes section metadata', () => {
    const result = validatePanelLimits({
      panels: [
        {
          id: 'section-1',
          title: 'Critical services',
          collapsed: false,
          grid: { y: 0 },
          panels: makePanels(MAX_PANELS + 1),
        },
      ],
      pinned_panels: [],
    });

    expect(result.isValid).toBe(false);
    expect(result.sectionViolations).toEqual([
      {
        id: 'section-1',
        title: 'Critical services',
        count: MAX_PANELS + 1,
        max: MAX_PANELS,
      },
    ]);
  });

  it('supports mixed violations', () => {
    const result = validatePanelLimits({
      panels: [
        ...makePanels(MAX_PANELS + 1),
        {
          id: 'section-1',
          title: 'Section',
          collapsed: false,
          grid: { y: 0 },
          panels: makePanels(MAX_PANELS + 2),
        },
      ],
      pinned_panels: Array.from({ length: MAX_CONTROLS_GROUP_SIZE + 1 }, () => ({
        id: 'control',
        type: 'options_list_control',
        width: 'medium',
        grow: false,
        config: {},
      })),
    });

    expect(result.isValid).toBe(false);
    expect(result.topLevel.exceeded).toBe(true);
    expect(result.pinnedPanels.exceeded).toBe(true);
    expect(result.sectionViolations).toHaveLength(1);
  });
});
