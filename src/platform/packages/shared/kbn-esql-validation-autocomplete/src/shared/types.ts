/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  ESQLControlVariable,
  IndexAutocompleteItem,
  RecommendedQuery,
  RecommendedField,
} from '@kbn/esql-types';
import { InferenceEndpointsAutocompleteResult } from '@kbn/esql-types/src/inference_endpoint_autocomplete_types';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import type { ESQLFieldWithMetadata } from '../validation/types';
/** @internal **/
type CallbackFn<Options = {}, Result = string> = (ctx?: Options) => Result[] | Promise<Result[]>;

/**
 *  Partial fields metadata client, used to avoid circular dependency with @kbn/monaco
/** @internal **/
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

/** @public **/
export interface ESQLSourceResult {
  name: string;
  hidden: boolean;
  title?: string;
  dataStreams?: Array<{ name: string; title?: string }>;
  type?: string;
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
  getJoinIndices?: () => Promise<{ indices: IndexAutocompleteItem[] }>;
  getTimeseriesIndices?: () => Promise<{ indices: IndexAutocompleteItem[] }>;
  getEditorExtensions?: (queryString: string) => Promise<{
    recommendedQueries: RecommendedQuery[];
    recommendedFields: RecommendedField[];
  }>;
  getInferenceEndpoints?: (
    taskType: InferenceTaskType
  ) => Promise<InferenceEndpointsAutocompleteResult>;
}

export type ReasonTypes = 'missingCommand' | 'unsupportedFunction' | 'unknownFunction';
