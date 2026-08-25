/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GridPanelData } from '../grid_panel';

export interface GridSectionData {
  id: string;
  row: number; // position of section in main grid
  title: string;
  isCollapsed: boolean;
  panels: {
    [key: string]: GridPanelData;
  };
}

export interface ActiveSectionEvent {
  id: string;
  targetSection?: string;
  sensorType: 'mouse' | 'touch' | 'keyboard';
  startingPosition: {
    top: number;
    left: number;
  };
  translate: {
    top: number;
    left: number;
  };
}

/**
 * MainSections are rendered without headers, which means they are non-collapsible and don't have
 * titles; these are "runtime" sections that do not get translated to the output GridLayoutData, since
 * all "widgets" of type `panel` get sent into these "fake" sections
 */
export type MainSection = Omit<GridSectionData, 'row' | 'isCollapsed' | 'title'> & {
  order: number;
  isMainSection: true;
};

/**
 * Collapsible sections correspond to the `section` widget type in `GridLayoutData` - they are
 * collapsible, have titles, can be re-ordered, etc.
 */
export type CollapsibleSection = Omit<GridSectionData, 'row'> & {
  order: number;
  isMainSection: false;
};
