/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import type { ILicense } from '@kbn/licensing-types';
import type { PricingProduct } from '@kbn/core-pricing-common/src/types';
import type { RecommendedField, RecommendedQuery } from './extensions_autocomplete_types';
import type { ESQLSourceResult, IndexAutocompleteItem } from './sources_autocomplete_types';
import type { ESQLControlVariable } from './variables_types';
import type { InferenceEndpointsAutocompleteResult } from './inference_endpoint_autocomplete_types';

/** @internal **/
type CallbackFn<Options = {}, Result = string> = (ctx?: Options) => Result[] | Promise<Result[]>;

/**
 * All supported field types in ES|QL. This is all the types
 * that can come back in the table from a query.
 */
export const esqlFieldTypes: readonly string[] = [
  'boolean',
  'date',
  'double',
  'ip',
  'keyword',
  'integer',
  'long',
  'text',
  'unsigned_long',
  'version',
  'cartesian_point',
  'cartesian_shape',
  'geo_point',
  'geo_shape',
  'counter_integer',
  'counter_long',
  'counter_double',
  'unsupported',
  'date_nanos',
  'function_named_parameters',
  'aggregate_metric_double',
  'dense_vector',
  'histogram',
  'exponential_histogram',
  'tdigest',
] as const;

export type EsqlFieldType = (typeof esqlFieldTypes)[number];

/**
 *  Partial fields metadata client, used to avoid circular dependency with @kbn/monaco
 **/
export interface PartialFieldsMetadataClient {
  find: ({ fieldNames, attributes }: { fieldNames?: string[]; attributes: string[] }) => Promise<{
    fields: Record<
      string,
      {
        type: string;
        source: string;
        description?: string;
      }
    >;
  }>;
}

export interface ESQLFieldWithMetadata {
  name: string;
  type: EsqlFieldType;
  userDefined: false;
  isEcs?: boolean;
  hasConflict?: boolean;
  isUnmappedField?: boolean;
  metadata?: {
    description?: string;
  };
}

export interface ESQLCallbacks {
  getSources?: CallbackFn<{}, ESQLSourceResult>;
  getColumnsFor?: CallbackFn<{ query: string }, ESQLFieldWithMetadata>;
  getPolicies?: CallbackFn<
    {},
    { name: string; sourceIndices: string[]; matchField: string; enrichFields: string[] }
  >;
  getPreferences?: () => Promise<{ histogramBarTarget: number }>;
  getFieldsMetadata?: Promise<PartialFieldsMetadataClient>;
  getVariables?: () => ESQLControlVariable[] | undefined;
  canSuggestVariables?: () => boolean;
  getJoinIndices?: (cacheOptions?: {
    forceRefresh?: boolean;
  }) => Promise<{ indices: IndexAutocompleteItem[] }>;
  getTimeseriesIndices?: () => Promise<{ indices: IndexAutocompleteItem[] }>;
  getEditorExtensions?: (queryString: string) => Promise<{
    recommendedQueries: RecommendedQuery[];
    recommendedFields: RecommendedField[];
  }>;
  getInferenceEndpoints?: (
    taskType: InferenceTaskType
  ) => Promise<InferenceEndpointsAutocompleteResult>;
  getLicense?: () => Promise<Pick<ILicense, 'hasAtLeast'> | undefined>;
  getActiveProduct?: () => PricingProduct | undefined;
  getHistoryStarredItems?: () => Promise<string[]>;
  canCreateLookupIndex?: (indexName: string) => Promise<boolean>;
  isServerless?: boolean;
}
