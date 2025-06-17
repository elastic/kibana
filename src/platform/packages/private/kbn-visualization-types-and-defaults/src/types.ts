/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui/src/components/icon/icon';
import type { Query } from '@kbn/data-plugin/common/types';
import type { IndexPatternAggRestrictions } from '@kbn/data-plugin/public';
import type { FieldSpec, DataViewSpec } from '@kbn/data-views-plugin/common';
import type { Filter, FilterMeta } from '@kbn/es-query/src/filters';
import type { FieldFormatParams } from '@kbn/field-formats-plugin/common';

export interface IndexPatternRef {
  id: string;
  title: string;
  name?: string;
}

export type IndexPatternField = FieldSpec & {
  displayName: string;
  aggregationRestrictions?: Partial<IndexPatternAggRestrictions>;
  /**
   * Map of fields which can be used, but may fail partially (ranked lower than others)
   */
  partiallyApplicableFunctions?: Partial<Record<string, boolean>>;
  timeSeriesMetric?: 'histogram' | 'summary' | 'gauge' | 'counter' | 'position';
  timeSeriesRollup?: boolean;
  meta?: boolean;
  runtime?: boolean;
};

export interface DateRange {
  fromDate: string;
  toDate: string;
}

interface PersistableFilterMeta extends FilterMeta {
  indexRefName?: string;
}

export interface PersistableFilter extends Filter {
  meta: PersistableFilterMeta;
}

export type SortingHint = string;

export type ValueLabelConfig = 'hide' | 'show';

export interface IndexPattern {
  getFormatterForField( // used extensively in lens
    sourceField: string
  ): unknown;
  id: string;
  fields: IndexPatternField[];
  getFieldByName(name: string): IndexPatternField | undefined;
  title: string;
  name?: string;
  timeFieldName?: string;
  fieldFormatMap?: Record<
    string,
    {
      id: string;
      params: FieldFormatParams;
    }
  >;
  hasRestrictions: boolean;
  spec: DataViewSpec;
  isPersisted: boolean;
}

export type IndexPatternMap = Record<string, IndexPattern>;

export interface PublicAPIProps<T> {
  state: T;
  layerId: string;
  indexPatterns: IndexPatternMap;
}

export type FieldOnlyDataType =
  | 'document'
  | 'ip'
  | 'histogram'
  | 'geo_point'
  | 'geo_shape'
  | 'counter'
  | 'gauge'
  | 'murmur3';
export type DataType = 'string' | 'number' | 'date' | 'boolean' | FieldOnlyDataType;

// An operation represents a column in a table, not any information
// about how the column was created such as whether it is a sum or average.
// Visualizations are able to filter based on the output, not based on the
// underlying data
export interface Operation extends OperationMetadata {
  // User-facing label for the operation
  label: string;
  sortingHint?: SortingHint;
}

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
  // Extra metadata to infer array support in an operation
  hasArraySupport?: boolean;
}

/**
 * Specific type used to store some meta information on top of the Operation type
 * Rather than populate the Operation type with optional types, it can leverage a super type
 */
export interface OperationDescriptor extends Operation {
  hasTimeShift: boolean;
  hasReducedTimeRange: boolean;
  inMetricDimension?: boolean;
}

export interface DataSourceInfo {
  layerId: string;
  dataView?: DataView;
  columns: Array<{
    id: string;
    role: 'split' | 'metric';
    operation: OperationDescriptor & { type: string; fields?: string[]; filter?: Query };
  }>;
}

export interface VisualizationInfo {
  layers: Array<{
    layerId: string;
    layerType: string;
    chartType?: string;
    icon?: IconType;
    label?: string;
    dimensions: Array<{ name: string; id: string; dimensionType: string }>;
    palette?: string[];
  }>;
}

type UserMessageDisplayLocation =
  | {
      // NOTE: We want to move toward more errors that do not block the render!
      id:
        | 'toolbar'
        | 'embeddableBadge'
        | 'visualization' // blocks render
        | 'visualizationOnEmbeddable' // blocks render in embeddable only
        | 'visualizationInEditor' // blocks render in editor only
        | 'textBasedLanguagesQueryInput'
        | 'banner';
    }
  | { id: 'dimensionButton'; dimensionId: string };

export type UserMessagesDisplayLocationId = UserMessageDisplayLocation['id'];

export interface UserMessage {
  uniqueId: string;
  severity: 'error' | 'warning' | 'info';
  hidePopoverIcon?: boolean;
  shortMessage: string;
  longMessage: string | React.ReactNode | ((closePopover?: () => void) => React.ReactNode);
  fixableInEditor: boolean;
  displayLocations: UserMessageDisplayLocation[];
}

export interface UserMessageFilters {
  severity?: UserMessage['severity'];
  dimensionId?: string;
}

export type UserMessagesGetter = (
  locationId: UserMessagesDisplayLocationId | UserMessagesDisplayLocationId[] | undefined,
  filters?: UserMessageFilters
) => UserMessage[];

export type AddUserMessages = (messages: UserMessage[]) => () => void;

/**
 * A visualization type advertised to the user in the chart switcher
 */
export interface VisualizationType {
  /**
   * Unique id of the visualization type within the visualization defining it
   */
  id: string;
  /**
   * Icon used in the chart switcher
   */
  icon: IconType;
  /**
   * Visible label used in the chart switcher and above the workspace panel in collapsed state
   */
  label: string;
  description: string;
  /**
   * Optional label used in visualization type search if chart switcher is expanded and for tooltips
   */
  fullLabel?: string;
  /**
   * Priority of the visualization for sorting in chart switch
   * Lower number means higher priority (aka top of list).
   *
   */
  sortPriority: number;
  /**
   * Indicates if visualization is in the experimental stage.
   */
  showExperimentalBadge?: boolean;
  /**
   * Indicates if visualization is deprecated.
   */
  isDeprecated?: boolean;
  subtypes?: string[];
  getCompatibleSubtype?: (seriesType?: string) => string | undefined;
}
