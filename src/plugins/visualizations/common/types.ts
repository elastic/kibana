/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import {
  AggParamsMapping,
  AggConfigSerialized,
  SerializedSearchSourceFields,
  METRIC_TYPES,
  BUCKET_TYPES,
} from '@kbn/data-plugin/common';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { Reference } from './content_management';

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

export type {
  VisualizationSavedObjectAttributes,
  VisualizationSavedObject,
} from './content_management';

export interface SerializedVisData {
  expression?: string;
  aggs: AggConfigSerialized[];
  searchSource: SerializedSearchSourceFields & { indexRefName?: string };
  savedSearchId?: string;
  savedSearchRefName?: string | Reference;
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
interface SchemaConfigParams {
  precision?: number;
  useGeocentroid?: boolean;
}

export type SupportedAggregation = METRIC_TYPES | BUCKET_TYPES;

type SchemasByAggs<Aggs extends SupportedAggregation> = {
  [Agg in Aggs]: GenericSchemaConfig<Agg>;
}[Aggs];

export interface GenericSchemaConfig<Agg extends SupportedAggregation> {
  accessor: number;
  label: string;
  format: SerializedFieldFormat;
  params: SchemaConfigParams;
  aggType: Agg;
  aggId?: string;
  aggParams?: AggParamsMapping[Agg];
}

export type SchemaConfig<Aggs extends SupportedAggregation = SupportedAggregation> =
  SchemasByAggs<Aggs>;
