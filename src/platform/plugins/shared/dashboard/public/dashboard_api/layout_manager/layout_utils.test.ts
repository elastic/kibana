/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { groupPanelsInSection } from './layout_utils';
import type { DashboardLayout } from './types';

const newSection = { id: 'newSection', title: 'New collapsible section' };

/**
 * Top-level panels: panelA (row 0) and panelB (row 0) side by side, panelC below them (row 4)
 * Section `section1` at row 8 with panelD (row 0) and panelE (row 3)
 * Top-level panelF at row 9, below `section1`
 */
const layout: DashboardLayout = {
  panels: {
    panelA: { type: 'lens', grid: { x: 0, y: 0, w: 24, h: 4 } },
    panelB: { type: 'lens', grid: { x: 24, y: 0, w: 24, h: 4 } },
    panelC: { type: 'lens', grid: { x: 0, y: 4, w: 12, h: 4 } },
    panelD: { type: 'lens', grid: { x: 0, y: 0, w: 12, h: 3, sectionId: 'section1' } },
    panelE: { type: 'lens', grid: { x: 12, y: 3, w: 12, h: 2, sectionId: 'section1' } },
    panelF: { type: 'lens', grid: { x: 0, y: 9, w: 12, h: 4 } },
  },
  sections: {
    section1: { title: 'Section one', collapsed: false, grid: { y: 8 } },
  },
  pinnedPanels: {},
};

describe('groupPanelsInSection', () => {
  test('adds an expanded section at the bottom of the layout', () => {
    const result = groupPanelsInSection(layout, ['panelC'], newSection);

    expect(result?.sections).toEqual({
      ...layout.sections,
      newSection: { title: 'New collapsible section', collapsed: false, grid: { y: 13 } },
    });
  });

  test('packs panels top-left in dashboard order', () => {
    // selection order does not matter: panelB (row 0), panelC (row 4), then section1 (row 8),
    // then panelF (row 9)
    const result = groupPanelsInSection(
      layout,
      ['panelF', 'panelE', 'panelC', 'panelB'],
      newSection
    );

    // panelB moves from column 24 to the left edge, so no horizontal gap is left
    expect(result?.panels.panelB).toEqual({
      type: 'lens',
      grid: { x: 0, y: 0, w: 24, h: 4, sectionId: 'newSection' },
    });
    expect(result?.panels.panelC).toEqual({
      type: 'lens',
      grid: { x: 24, y: 0, w: 12, h: 4, sectionId: 'newSection' },
    });
    expect(result?.panels.panelE).toEqual({
      type: 'lens',
      grid: { x: 36, y: 0, w: 12, h: 2, sectionId: 'newSection' },
    });
    // the first row is full, so panelF fills the space below the shorter panelE
    expect(result?.panels.panelF).toEqual({
      type: 'lens',
      grid: { x: 36, y: 2, w: 12, h: 4, sectionId: 'newSection' },
    });
    // panels that are not grouped are left untouched
    expect(result?.panels.panelA).toBe(layout.panels.panelA);
    expect(result?.panels.panelD).toBe(layout.panels.panelD);
  });
});
