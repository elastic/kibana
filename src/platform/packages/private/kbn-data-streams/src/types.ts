/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TransportRequestOptionsWithOutMeta } from '@elastic/elasticsearch';
import type api from '@elastic/elasticsearch/lib/api/types';

export type StrictDynamic = false | 'strict';

export type ToStrictMappingProperty<P extends api.MappingProperty> = Omit<P, 'properties'> & {
  dynamic?: StrictDynamic;
};

export type Strict<P extends api.MappingProperty> = ToStrictMappingProperty<P>;

export type StrictMappingTypeMapping = Strict<api.MappingTypeMapping>;

export type KeywordMapping = Strict<api.MappingKeywordProperty>;
export type TextMapping = Strict<api.MappingTextProperty>;
export type DateMapping = Strict<api.MappingDateProperty>;
export type DateNanosMapping = Strict<api.MappingDateNanosProperty>;
export type LongMapping = Strict<api.MappingLongNumberProperty>;
export type IntegerMapping = Strict<api.MappingIntegerNumberProperty>;
export type ShortMapping = Strict<api.MappingShortNumberProperty>;
export type BooleanMapping = Strict<api.MappingBooleanProperty>;
export type FlattenedMapping = Strict<api.MappingFlattenedProperty>;

// Map ES data types to JavaScript types
type StringMapping = KeywordMapping | TextMapping | DateMapping | DateNanosMapping;

// interface JestIntegrationTestHelpers {
//   assertBackwardsCompatible: (
//     definitions: Array<{
//       sampleDocs: Array<Record<string, unknown>>;
//       dataStream: DataStreamDefinition;
//     }>
//   ) => Promise<void>;
//   toSnapshot: (...dataStream: DataStreamDefinition[]) => void;
//   mappingsHash: (dataStream: DataStreamDefinition) => string;
// }

export interface MappingsHelpers {
  date: () => KeywordMapping;
  keyword: () => KeywordMapping;
  text: () => TextMapping;
}

// export interface SearchRuntimeMappingsHelpers {
//   remap: (args: {
//     previousFieldName: string;
//     fieldName: string;
//     type: api.MappingRuntimeFieldType;
//   }) => api.MappingRuntimeField;
// }

type DataStreamDefinitionMappings<Schema extends {}> = Pick<
  Omit<StrictMappingTypeMapping, 'properties'> & {
    properties?: ObjectToPropertiesDefinition<Schema>;
  },
  'dynamic' | 'properties'
>;

export interface BaseSearchRuntimeMappings {
  [objectPath: string]: api.MappingRuntimeField;
}

/**
 * A definition of a data stream that encompasses the data stream and the index template.
 *
 * TODO: design/expose definition component templates.
 */
export interface DataStreamDefinition<
  Schema extends {} = {},
  SearchRuntimeMappings extends BaseSearchRuntimeMappings = {}
> {
  /**
   * @remark Once released this should never change.
   */
  name: string;

  // https://www.elastic.co/docs/manage-data/data-store/mapping/define-runtime-fields-in-search-request
  searchRuntimeMappings?: SearchRuntimeMappings;

  /**
   * Is this a hidden data stream?
   * @default true
   */
  hidden?: boolean;

  /**
   * @remark Must be **incremented** in order to release a new version of the template definition.
   * @remark Must be greater than 0
   */
  version: number;

  /**
   * The index template definition for the data stream.
   *
   * This template definition corresponds to types from ES:
   *  - api.IndicesPutIndexTemplateRequest
   *  - api.IndicesIndexTemplate
   *  - api.IndicesIndexTemplateSummary
   */
  template: Pick<api.IndicesIndexTemplateSummary, 'aliases'> & {
    /** @default 100 */
    priority?: number;

    /**
     * Auto-populated with the following properties:
     * managed: true;                  // present as a managed index template/data stream
     * userAgent: string;              // an indication of what code created the resources
     * version: string;                // the deployed version of the template definition
     * previousVersions: string[];     // previous data stream definitions
     */
    _meta?: {
      [key: string]: unknown;
    };

    mappings?: DataStreamDefinitionMappings<Schema>;

    /**
     * @remark "hidden" defaults to true for the data stream and the backing indices
     */
    settings?: api.IndicesIndexSettings;

    /**
     * @remark Stick to defining and sharing mappings as plain JavaScript objects.
     * @remark Use component templates if you would like to allow end users to define mappings. You will have to ensure
     *         that updated mappings are applied to existing indices.
     */
    composedOf?: string[];
  };
}

// Data client

export interface SearchRequestImproved<SearchRuntimeMappings extends BaseSearchRuntimeMappings = {}>
  extends Omit<api.SearchRequest, 'index' | 'fields'> {
  fields?: Array<Exclude<keyof SearchRuntimeMappings, number | symbol>>;
}

export interface ClientHelpers<SRM extends BaseSearchRuntimeMappings> {
  /** A helper to get types from your search runtime fields */
  getFieldsFromHit: (response: api.SearchHit) => {
    [key in Exclude<keyof SRM, number | symbol>]: unknown[];
  };
}

export type IDataStreamClientIndexRequest<S extends object> = Omit<api.IndexRequest<S>, 'index'>;

/**
 * A client for interacting with data streams in Elasticsearch.
 *
 * Follows the Elasticsearch JS client interface as closely as possible.
 */
export interface IDataStreamClient<S extends {}, SRM extends BaseSearchRuntimeMappings> {
  /**
   * The Elasticsearch JS client search interface
   */
  search: <Agg extends Record<string, api.AggregationsAggregate> = {}>(
    req: SearchRequestImproved<SRM>,
    transportOpts?: TransportRequestOptionsWithOutMeta
  ) => Promise<api.SearchResponse<S, Agg>>;

  /**
   * The Elasticsearch JS client index interface.
   */
  index: (req: IDataStreamClientIndexRequest<S>) => Promise<api.IndexResponse>;

  helpers: ClientHelpers<SRM>;
}

// An attempt at getting TS to check mapping properties match the schema
type ObjectToPropertiesDefinition<O extends Record<string, unknown>> = {} extends O
  ? never
  : {
      [K in keyof O]?: {} extends O[K]
        ? never
        : O[K] extends Record<string, unknown>
        ? Omit<Strict<api.MappingObjectProperty>, 'properties'> & {
            type: 'object';
            properties: ObjectToPropertiesDefinition<O[K]>;
          }
        : O[K] extends string
        ? StringMapping
        : Strict<api.MappingProperty>;
    };

export type AnyDataStreamDefinition = DataStreamDefinition<any, any>;
