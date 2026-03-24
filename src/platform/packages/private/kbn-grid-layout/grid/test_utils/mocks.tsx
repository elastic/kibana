/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject, Subject } from 'rxjs';
import type { ObservedSize } from 'use-resize-observer/polyfilled';

import type { ActivePanelEvent } from '../grid_panel';
import type { ActiveSectionEvent } from '../grid_section';
import type {
  GridAccessMode,
  GridLayoutData,
  GridLayoutStateManager,
  OrderedLayout,
  RuntimeGridSettings,
} from '../types';
import { getSampleOrderedLayout } from './sample_layout';

const DASHBOARD_MARGIN_SIZE = 8;
const DASHBOARD_GRID_HEIGHT = 20;
const DASHBOARD_GRID_COLUMN_COUNT = 48;

export const gridSettings = {
  gutterSize: DASHBOARD_MARGIN_SIZE,
  rowHeight: DASHBOARD_GRID_HEIGHT,
  columnCount: DASHBOARD_GRID_COLUMN_COUNT,
};
export const mockRenderPanelContents = jest.fn((panelId) => (
  <button aria-label={`panelId:${panelId}`}>panel content {panelId}</button>
));

export const getGridLayoutStateManagerMock = (overrides?: Partial<GridLayoutStateManager>) => {
  return {
    accessMode$: new BehaviorSubject<GridAccessMode>('EDIT'),
    activePanelEvent$: new BehaviorSubject<ActivePanelEvent | undefined>(undefined),
    activeSectionEvent$: new BehaviorSubject<ActiveSectionEvent | undefined>(undefined),
    expandedPanelId$: new BehaviorSubject<string | undefined>(undefined),
    gridDimensions$: new BehaviorSubject<ObservedSize>({ width: 600, height: 900 }),
    gridLayout$: new BehaviorSubject<OrderedLayout>(getSampleOrderedLayout()),
    headerRefs: { current: {} },
    isMobileView$: new BehaviorSubject<boolean>(false),
    layoutRef: { current: {} },
    layoutUpdated$: new Subject<void>(),
    panelRefs: { current: {} },
    proposedGridLayout$: new BehaviorSubject<GridLayoutData | undefined>(undefined),
    runtimeSettings$: new BehaviorSubject<RuntimeGridSettings>({
      ...gridSettings,
      columnPixelWidth: 10,
      keyboardDragTopLimit: 0,
    }),
    sectionRefs: { current: {} },
    ...overrides,
  } as GridLayoutStateManager;
};
