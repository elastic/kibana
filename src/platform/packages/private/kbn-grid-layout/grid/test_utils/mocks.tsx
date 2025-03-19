/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { ObservedSize } from 'use-resize-observer/polyfilled';
import {
  ActivePanel,
  GridAccessMode,
  GridLayoutData,
  GridLayoutStateManager,
  PanelInteractionEvent,
  RuntimeGridSettings,
} from '../types';
import { getSampleLayout } from './sample_layout';

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
    expandedPanelId$: new BehaviorSubject<string | undefined>(undefined),
    isMobileView$: new BehaviorSubject<boolean>(false),
    gridLayout$: new BehaviorSubject<GridLayoutData>(getSampleLayout()),
    proposedGridLayout$: new BehaviorSubject<GridLayoutData | undefined>(undefined),
    runtimeSettings$: new BehaviorSubject<RuntimeGridSettings>({
      ...gridSettings,
      columnPixelWidth: 0,
    }),
    panelRefs: { current: [] },
    rowRefs: { current: [] },
    accessMode$: new BehaviorSubject<GridAccessMode>('EDIT'),
    interactionEvent$: new BehaviorSubject<PanelInteractionEvent | undefined>(undefined),
    activePanel$: new BehaviorSubject<ActivePanel | undefined>(undefined),
    gridDimensions$: new BehaviorSubject<ObservedSize>({ width: 600, height: 900 }),
    ...overrides,
  };
};
