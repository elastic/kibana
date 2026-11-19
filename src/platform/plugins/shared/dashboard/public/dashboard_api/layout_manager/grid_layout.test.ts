/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitFor } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';

import { initializeGridLayout, transformDashboardLayoutToGridLayout } from './grid_layout';
import type { DashboardLayout } from './types';

const mockGetEmbeddableDefinition = jest.fn();
jest.mock('../../services/kibana_services', () => ({
  embeddableService: {
    getEmbeddableDefinition: (type: string) => mockGetEmbeddableDefinition(type),
  },
}));

const layout: DashboardLayout = {
  panels: {
    panelA: { type: 'lens', grid: { x: 0, y: 0, w: 24, h: 4 } },
    panelB: { type: 'map', grid: { x: 24, y: 2, w: 12, h: 3, sectionId: 'section1' } },
  },
  sections: {
    section1: { title: 'Section one', collapsed: true, grid: { y: 4 } },
    section2: { title: 'Section two', collapsed: false, grid: { y: 8 } },
  },
  pinnedPanels: {},
};

describe('transformDashboardLayoutToGridLayout', () => {
  test('converts an empty layout to an empty grid layout', () => {
    expect(
      transformDashboardLayoutToGridLayout({ panels: {}, sections: {}, pinnedPanels: {} }, {})
    ).toEqual({});
  });

  test('adds sections with their panels nested and top-level panels keyed by id', () => {
    expect(transformDashboardLayoutToGridLayout(layout, {})).toEqual({
      section1: {
        id: 'section1',
        type: 'section',
        row: 4,
        isCollapsed: true,
        title: 'Section one',
        panels: {
          panelB: {
            id: 'panelB',
            row: 2,
            column: 24,
            width: 12,
            height: 3,
            resizeOptions: undefined,
          },
        },
      },
      section2: {
        id: 'section2',
        type: 'section',
        row: 8,
        isCollapsed: false,
        title: 'Section two',
        panels: {},
      },
      panelA: {
        id: 'panelA',
        type: 'panel',
        row: 0,
        column: 0,
        width: 24,
        height: 4,
        resizeOptions: undefined,
      },
    });
  });

  test('applies resize settings by panel type', () => {
    const lensConstraints = { minWidth: 8, minHeight: 4 };
    const result = transformDashboardLayoutToGridLayout(layout, { lens: lensConstraints });

    expect(result.panelA).toMatchObject({ resizeOptions: lensConstraints });
    expect((result.section1 as any).panels.panelB.resizeOptions).toBeUndefined();
  });
});

describe('initializeGridLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmbeddableDefinition.mockResolvedValue(undefined);
  });

  test('publishes the grid layout for the initial layout without waiting for resize settings', () => {
    const layout$ = new BehaviorSubject(layout);
    const { gridLayout$, cleanup } = initializeGridLayout(layout$);

    expect(gridLayout$.value).toEqual(transformDashboardLayoutToGridLayout(layout, {}));
    cleanup();
  });

  test('adds layout constraints from the embeddable definition once they load', async () => {
    const lensConstraints = { minWidth: 8, minHeight: 4 };
    mockGetEmbeddableDefinition.mockImplementation(async (type: string) =>
      type === 'lens' ? { layoutConstraints: lensConstraints } : undefined
    );
    const layout$ = new BehaviorSubject(layout);
    const { gridLayout$, cleanup } = initializeGridLayout(layout$);

    await waitFor(() =>
      expect(gridLayout$.value.panelA).toMatchObject({ resizeOptions: lensConstraints })
    );
    cleanup();
  });

  test('updates the grid layout when the layout changes', () => {
    const layout$ = new BehaviorSubject(layout);
    const { gridLayout$, cleanup } = initializeGridLayout(layout$);

    const updatedLayout: DashboardLayout = {
      ...layout,
      panels: { ...layout.panels, panelA: { type: 'lens', grid: { x: 0, y: 6, w: 24, h: 4 } } },
    };
    layout$.next(updatedLayout);

    expect(gridLayout$.value.panelA).toMatchObject({ row: 6 });
    cleanup();
  });

  test('stops updating after cleanup', () => {
    const layout$ = new BehaviorSubject(layout);
    const { gridLayout$, cleanup } = initializeGridLayout(layout$);
    cleanup();

    layout$.next({ panels: {}, sections: {}, pinnedPanels: {} });

    expect(gridLayout$.value.panelA).toBeDefined();
  });
});
