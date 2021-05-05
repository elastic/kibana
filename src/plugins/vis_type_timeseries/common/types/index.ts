/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPattern } from '../../../data/common';
import { Panel } from './common';

export { Metric, Series, Panel } from './common';
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

export interface QueryObject {
  language: string;
  query: string | { [key: string]: any };
}

export interface Annotation {
  color?: string;
  fields?: string;
  hidden?: boolean;
  icon?: string;
  id: string;
  ignore_global_filters?: number;
  ignore_panel_filters?: number;
  index_pattern: IndexPatternValue;
  query_string?: QueryObject;
  template?: string;
  time_field?: string;
}

export interface VisPayload {
  filters: any[];
  panels: Panel[];
  // general
  query: QueryObject[];
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
