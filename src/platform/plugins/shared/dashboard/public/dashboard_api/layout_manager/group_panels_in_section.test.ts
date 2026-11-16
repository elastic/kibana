/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { groupPanelsInSection } from './group_panels_in_section';
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

  test('keeps the arrangement of top-level panels relative to each other', () => {
    const result = groupPanelsInSection(layout, ['panelB', 'panelC'], newSection);

    expect(result?.panels.panelB).toEqual({
      type: 'lens',
      grid: { x: 24, y: 0, w: 24, h: 4, sectionId: 'newSection' },
    });
    expect(result?.panels.panelC).toEqual({
      type: 'lens',
      grid: { x: 0, y: 4, w: 12, h: 4, sectionId: 'newSection' },
    });
    // panels that are not grouped are left untouched
    expect(result?.panels.panelA).toBe(layout.panels.panelA);
    expect(result?.panels.panelD).toBe(layout.panels.panelD);
  });

  test('stacks panels from each source in the order the sources appear in the dashboard', () => {
    // selection order does not matter: section1 (row 8) comes before panelF (row 9)
    const result = groupPanelsInSection(
      layout,
      ['panelF', 'panelE', 'panelA', 'panelD'],
      newSection
    );

    // top-level panels above section1 come first
    expect(result?.panels.panelA.grid).toMatchObject({ y: 0, sectionId: 'newSection' });
    // then the panels from section1 (5 rows high), below panelA (4 rows high)
    expect(result?.panels.panelD.grid).toMatchObject({ y: 4, sectionId: 'newSection' });
    expect(result?.panels.panelE.grid).toMatchObject({ y: 7, sectionId: 'newSection' });
    // then the top-level panel below section1
    expect(result?.panels.panelF.grid).toMatchObject({ y: 9, sectionId: 'newSection' });
  });
});
