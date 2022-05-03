/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { AggConfigSerialized, SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { SavedObjectAttributes } from '@kbn/core/types';

export interface VisParams {
  [key: string]: any;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SavedVisState<TVisParams = SerializableRecord> = {
  title: string;
  type: string;
  params: TVisParams;
  aggs: AggConfigSerialized[];
};

export interface VisualizationSavedObjectAttributes extends SavedObjectAttributes {
  description: string;
  kibanaSavedObjectMeta: {
    searchSourceJSON: string;
  };
  title: string;
  version: number;
  visState: string;
  uiStateJSON: string;
}

export interface SerializedVisData {
  expression?: string;
  aggs: AggConfigSerialized[];
  searchSource: SerializedSearchSourceFields;
  savedSearchId?: string;
}

export interface SerializedVis<T = VisParams> {
  id?: string;
  title: string;
  description?: string;
  type: string;
  params: T;
  uiState?: any;
  data: SerializedVisData;
}
