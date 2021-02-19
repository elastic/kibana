/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TypeOf } from '@kbn/config-schema';
import { fieldObject, metricsItems, panel, seriesItems, visPayloadSchema } from './vis_schema';
import { PANEL_TYPES } from './panel_types';
import { TimeseriesUIRestrictions } from './ui_restrictions';

export type SeriesItemsSchema = TypeOf<typeof seriesItems>;
export type MetricsItemsSchema = TypeOf<typeof metricsItems>;
export type PanelSchema = TypeOf<typeof panel>;
export type VisPayload = TypeOf<typeof visPayloadSchema>;
export type FieldObject = TypeOf<typeof fieldObject>;

export interface PanelData {
  id: string;
  label: string;
  data: Array<[number, number]>;
}

// series data is not fully typed yet
type SeriesData = {
  type: Exclude<PANEL_TYPES, PANEL_TYPES.TABLE>;
  uiRestrictions: TimeseriesUIRestrictions;
} & {
  [key: string]: {
    annotations: {
      [key: string]: unknown[];
    };
    id: string;
    series: PanelData[];
    error?: unknown;
  };
};

interface TableData {
  type: PANEL_TYPES.TABLE;
  uiRestrictions: TimeseriesUIRestrictions;
  series?: PanelData[];
  pivot_label?: string;
}

export type TimeseriesVisData = SeriesData | TableData;

export const isVisDataTable = (data: TimeseriesVisData): data is TableData =>
  (data as TableData).type === PANEL_TYPES.TABLE;

export interface SanitizedFieldType {
  name: string;
  type: string;
  label?: string;
}
