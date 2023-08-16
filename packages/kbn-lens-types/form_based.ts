/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Query } from '@kbn/es-query';

export type DataType = 'string' | 'number' | 'date' | 'boolean' | FieldOnlyDataType;

export type SortingHint = string;

export type TimeScaleUnit = 's' | 'm' | 'h' | 'd';

export interface OperationMetadata {
  interval?: string;
  // The output of this operation will have this data type
  dataType: DataType;
  // A bucketed operation is grouped by duplicate values, otherwise each row is
  // treated as unique
  isBucketed: boolean;
  /**
   * ordinal: Each name is a unique value, but the names are in sorted order, like "Top values"
   * interval: Histogram data, like date or number histograms
   * ratio: Most number data is rendered as a ratio that includes 0
   */
  scale?: 'ordinal' | 'interval' | 'ratio';
  // Extra meta-information like cardinality, color
  // TODO currently it's not possible to differentiate between a field from a raw
  // document and an aggregated metric which might be handy in some cases. Once we
  // introduce a raw document datasource, this should be considered here.
  isStaticValue?: boolean;
}

// An operation represents a column in a table, not any information
// about how the column was created such as whether it is a sum or average.
// Visualizations are able to filter based on the output, not based on the
// underlying data
export interface Operation extends OperationMetadata {
  // User-facing label for the operation
  label: string;
  sortingHint?: SortingHint;
}

export interface BaseIndexPatternColumn extends Operation {
  // Private
  operationType: string;
  customLabel?: boolean;
  timeScale?: TimeScaleUnit;
  filter?: Query;
  reducedTimeRange?: string;
  timeShift?: string;
}

export interface FieldBasedIndexPatternColumn extends BaseIndexPatternColumn {
  sourceField: string;
}

export interface ValueFormatConfig {
  id: string;
  params?: {
    decimals: number;
    suffix?: string;
    compact?: boolean;
    pattern?: string;
    fromUnit?: string;
    toUnit?: string;
  };
}

// Formatting can optionally be added to any column
export interface FormattedIndexPatternColumn extends BaseIndexPatternColumn {
  params?: {
    format?: ValueFormatConfig;
  };
}

export interface ReferenceBasedIndexPatternColumn extends FormattedIndexPatternColumn {
  references: string[];
}

export type GenericIndexPatternColumn =
  | BaseIndexPatternColumn
  | FieldBasedIndexPatternColumn
  | ReferenceBasedIndexPatternColumn;

export interface FormBasedLayer {
  columnOrder: string[];
  columns: Record<string, GenericIndexPatternColumn>;
  // Each layer is tied to the index pattern that created it
  indexPatternId: string;
  linkToLayers?: string[];
  // Partial columns represent the temporary invalid states
  incompleteColumns?: Record<string, IncompleteColumn>;
  sampling?: number;
  ignoreGlobalFilters?: boolean;
}

export interface FormBasedPersistedState {
  layers: Record<string, Omit<FormBasedLayer, 'indexPatternId'>>;
}

/**
 * A union type of all available operation types. The operation type is a unique id of an operation.
 * Each column is assigned to exactly one operation type.
 */
export type OperationType = string;

// Used to store the temporary invalid state
export interface IncompleteColumn {
  operationType?: OperationType;
  sourceField?: string;
}
