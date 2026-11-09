/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BehaviorSubject, Observable } from 'rxjs';
import type { ObservedSize } from 'use-resize-observer/polyfilled';
import type { ScrollContainer } from '@kbn/core-chrome-layout-utils';
import type { ActivePanelEvent, FlexPanelData } from './grid_panel';

/**
 * The settings for how the grid should be rendered
 */
export interface GridSettings {
  gutterSize: number;
  rowHeight: number;
  columnCount: number;
  keyboardDragTopLimit: number;
}

export type FlexLayoutPanel = FlexPanelData & { type: 'panel' };

export interface FlexLayoutData {
  [key: string]: FlexLayoutPanel;
}

export type FlexLayoutElementsInOrder = Array<{ id: string }>;

export interface FlexLayoutStateManager {
  gridLayout$: BehaviorSubject<FlexLayoutData>;
  accessMode$: BehaviorSubject<GridAccessMode>;
  gridDimensions$: BehaviorSubject<ObservedSize>;
  gridSettings$: BehaviorSubject<GridSettings>;

  scrollContainer$: BehaviorSubject<ScrollContainer>;

  activePanelEvent$: BehaviorSubject<ActivePanelEvent | undefined>;
  layoutUpdated$: Observable<FlexLayoutData>;

  layoutRef: React.MutableRefObject<HTMLDivElement | null>;
  panelRefs: React.MutableRefObject<{ [panelId: string]: HTMLDivElement | null }>;
}

/**
 * This type is used to conditionally change the type of `renderPanelContents` depending
 * on the value of `useCustomDragHandle`
 */
export type UseCustomDragHandle =
  | {
      useCustomDragHandle: true;
      renderPanelContents: (
        panelId: string,
        setDragHandles: (refs: Array<HTMLElement | null>) => void
      ) => React.ReactNode;
    }
  | {
      useCustomDragHandle?: false;
      renderPanelContents: (panelId: string) => React.ReactNode;
    };

/**
 * Controls whether the resize + drag handles are visible and functioning
 */
export type GridAccessMode = 'VIEW' | 'EDIT';
