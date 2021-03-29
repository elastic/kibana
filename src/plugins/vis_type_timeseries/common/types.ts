/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  metricsItems,
  panel,
  seriesItems,
  visPayloadSchema,
  fieldObject,
  indexPattern,
  annotationsItems,
} from './vis_schema';
import { PANEL_TYPES } from './panel_types';
import { TimeseriesUIRestrictions } from './ui_restrictions';
import { IndexPattern } from '../../data/common';

export type AnnotationItemsSchema = TypeOf<typeof annotationsItems>;
export type SeriesItemsSchema = TypeOf<typeof seriesItems>;
export type MetricsItemsSchema = TypeOf<typeof metricsItems>;
export type PanelSchema = TypeOf<typeof panel>;
export type VisPayload = TypeOf<typeof visPayloadSchema>;
export type FieldObject = TypeOf<typeof fieldObject>;
export type IndexPatternValue = TypeOf<typeof indexPattern>;

export interface FetchedIndexPattern {
  indexPattern: IndexPattern | undefined | null;
  indexPatternString: string | undefined;
}

export interface PanelData {
  id: string;
  label: string;
  data: Array<[number, number]>;
}

// series data is not fully typed yet
interface SeriesData {
  [key: string]: {
    annotations: {
      [key: string]: unknown[];
    };
    id: string;
    series: PanelData[];
    error?: unknown;
  };
}

export type TimeseriesVisData = SeriesData & {
  type: PANEL_TYPES;
  uiRestrictions: TimeseriesUIRestrictions;
  /**
   * series array is responsible only for "table" vis type
   */
  series?: unknown[];
};

export interface SanitizedFieldType {
  name: string;
  type: string;
  label?: string;
}

export enum PALETTES {
  GRADIENT = 'gradient',
  RAINBOW = 'rainbow',
}
