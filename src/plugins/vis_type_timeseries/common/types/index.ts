/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPattern } from '../../../data/common';
import { TimeseriesUIRestrictions } from '../ui_restrictions';
import { PANEL_TYPES } from '../panel_types';

export * from './common';

export interface FetchedIndexPattern {
  indexPattern: IndexPattern | undefined | null;
  indexPatternString: string | undefined;
}

export type TimeseriesVisData = SeriesData | TableData;

interface TableData {
  type: PANEL_TYPES.TABLE;
  uiRestrictions: TimeseriesUIRestrictions;
  series?: PanelData[];
  pivot_label?: string;
}

// series data is not fully typed yet
export type SeriesData = {
  type: Exclude<PANEL_TYPES, PANEL_TYPES.TABLE>;
  uiRestrictions: TimeseriesUIRestrictions;
  error?: string;
} & {
  [key: string]: PanelSeries;
};

interface PanelSeries {
  annotations: {
    [key: string]: unknown[];
  };
  id: string;
  series: PanelData[];
  error?: string;
}

export interface PanelData {
  id: string;
  label: string;
  data: Array<[number, number]>;
  seriesId: string;
  splitByLabel: string;
  isSplitByTerms: boolean;
  error?: string;
}

export const isVisTableData = (data: TimeseriesVisData): data is TableData =>
  data.type === PANEL_TYPES.TABLE;

export const isVisSeriesData = (data: TimeseriesVisData): data is SeriesData =>
  data.type !== PANEL_TYPES.TABLE;

export interface SanitizedFieldType {
  name: string;
  type: string;
  label?: string;
}

export enum PALETTES {
  GRADIENT = 'gradient',
  RAINBOW = 'rainbow',
}

export enum TOOLTIP_MODES {
  SHOW_ALL = 'show_all',
  SHOW_FOCUSED = 'show_focused',
}
