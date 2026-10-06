/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type { RuntimeFieldSpec } from './runtime_field';
import type { DataViewFieldMap, FieldAttrsAsObject } from './field_spec';

/**
 * Aggregation restrictions for rollup fields
 */
export type AggregationRestrictions = Record<
  string,
  {
    agg?: string;
    interval?: number;
    fixed_interval?: string;
    calendar_interval?: string;
    delay?: string;
    time_zone?: string;
  }
>;

/**
 * Interface for metadata about rollup indices
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type TypeMeta = {
  /**
   * Aggregation restrictions for rollup fields
   */
  aggs?: Record<string, AggregationRestrictions>;
  /**
   * Params for retrieving rollup field data
   */
  params?: {
    /**
     * Rollup index name used for loading field list
     */
    rollup_index: string;
  };
};

/**
 * Data View type. Default or rollup
 */
export enum DataViewType {
  DEFAULT = 'default',
  ROLLUP = 'rollup',
}

/**
 * Source filter configuration
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SourceFilter = {
  value: string;
  clientId?: string | number;
};

/**
 * Interface for the data view saved object
 * @public
 */
export interface DataViewAttributes {
  /**
   * Fields as a serialized array of field specs
   */
  fields?: string;
  /**
   * Data view title
   */
  title: string;
  /**
   * Data view type, default or rollup
   */
  type?: string;
  /**
   * Type metadata information, serialized. Only used by rollup data views.
   */
  typeMeta?: string;
  /**
   * Time field name
   */
  timeFieldName?: string;
  /**
   * Serialized array of filters. Used by discover to hide fields.
   */
  sourceFilters?: string;
  /**
   * Serialized map of field formats by field name
   */
  fieldFormatMap?: string;
  /**
   * Serialized map of field attributes, currently field count and name
   */
  fieldAttrs?: string;
  /**
   * Serialized map of runtime field definitions, by field name
   */
  runtimeFieldMap?: string;
  /**
   * Prevents errors when index pattern exists before indices
   */
  allowNoIndex?: boolean;
  /**
   * Name of the data view. Human readable name used to differentiate data view.
   */
  name?: string;
  /**
   * Allow hidden and system indices when loading field list
   */
  allowHidden?: boolean;
}

/**
 * Static data view format
 * Serialized data object, representing data view attributes and state
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type DataViewSpec = {
  /**
   * Saved object id (or generated id if in-memory only)
   */
  id?: string;
  /**
   * Saved object version string
   */
  version?: string;
  /**
   * Contrary to its name, this property sets the index pattern of the data view. (e.g. `logs-*,metrics-*`)
   *
   * Use the `name` property instead to set a human readable name for the data view.
   */
  title?: string;
  /**
   * Name of timestamp field
   */
  timeFieldName?: string;
  /**
   * List of filters which discover uses to hide fields
   */
  sourceFilters?: SourceFilter[];
  /**
   * Map of fields by name
   */
  fields?: DataViewFieldMap;
  /**
   * Metadata about data view, only used by rollup data views
   */
  typeMeta?: TypeMeta;
  /**
   * Default or rollup
   */
  type?: string;
  /**
   * Map of serialized field formats by field name
   */
  fieldFormats?: Record<string, SerializedFieldFormat>;
  /**
   * Map of runtime fields by field name
   */
  runtimeFieldMap?: Record<string, RuntimeFieldSpec>;
  /**
   * Map of field attributes by field name, currently customName and count
   */
  fieldAttrs?: FieldAttrsAsObject;
  /**
   * Determines whether failure to load field list should be reported as error
   */
  allowNoIndex?: boolean;
  /**
   * Array of namespace ids
   */
  namespaces?: string[];
  /**
   * Human readable name used to differentiate the data view.
   */
  name?: string;
  /**
   * Allow hidden and system indices when loading field list
   */
  allowHidden?: boolean;
  /**
   * Whether the data view is managed by the application.
   */
  managed?: boolean;
};
