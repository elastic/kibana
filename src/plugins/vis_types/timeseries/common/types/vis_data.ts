/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PANEL_TYPES } from '../enums';
import type { TimeseriesUIRestrictions } from '../ui_restrictions';

export type TimeseriesVisData = SeriesData | TableData;

export type TrackedEsSearches = Record<
  string,
  {
    body: Record<string, any>;
    label?: string;
    time: number;
    response?: Record<string, any>;
  }
>;

export interface DataResponseMeta {
  type: PANEL_TYPES;
  uiRestrictions: TimeseriesUIRestrictions;
  trackedEsSearches: TrackedEsSearches;
}

export interface TableData extends DataResponseMeta {
  series?: PanelData[];
  pivot_label?: string;
}

// series data is not fully typed yet
export type SeriesData = DataResponseMeta & {
  error?: string;
} & Record<string, PanelSeries>;

export interface PanelSeries {
  annotations: Record<string, Annotation[]>;
  id: string;
  series: PanelData[];
  error?: string;
}

export interface PanelData {
  id: string;
  label: string | string[];
  labelFormatted?: string;
  data: PanelDataArray[];
  seriesId: string;
  splitByLabel: string;
  isSplitByTerms: boolean;
  error?: string;
}

export type PanelDataArray = [number | undefined | string, number | string | null];

export interface Annotation {
  key: number;
  docs: Array<Record<string, string>>;
}
