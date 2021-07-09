/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter, IndexPattern, Query } from '../../../data/common';
import { Panel } from './panel_model';

export { Metric, Series, Panel } from './panel_model';
export { TimeseriesVisData, PanelData, SeriesData, TableData } from './vis_data';

export interface FetchedIndexPattern {
  indexPattern: IndexPattern | undefined | null;
  indexPatternString: string | undefined;
}

export interface SanitizedFieldType {
  name: string;
  type: string;
  label?: string;
}

export type IndexPatternValue = { id: string } | string | undefined;

export interface Annotation {
  color?: string;
  fields?: string;
  hidden?: boolean;
  icon?: string;
  id: string;
  ignore_global_filters?: number;
  ignore_panel_filters?: number;
  index_pattern: IndexPatternValue;
  query_string?: Query;
  template?: string;
  time_field?: string;
}

export interface VisPayload {
  filters: Filter[];
  panels: Panel[];
  // general
  query: Query[];
  state: {
    sort?: {
      column: string;
      order: 'asc' | 'desc';
    };
  };
  timerange: {
    timezone: string;
    min: string;
    max: string;
  };
  searchSession?: {
    sessionId: string;
    isRestore: boolean;
    isStored: boolean;
  };
}
