/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IconType } from '@elastic/eui';
import { DataPublicPluginSetup } from '../../../data/public';
import { FieldFormatsSetup } from '../../../field_formats/public';
import { ChartsPluginSetup } from '../../../charts/public';
import { IFieldFormat, SerializedFieldFormat } from '../../../../plugins/field_formats/common';
import type { RangeSelectContext, ValueClickContext } from '../../../../plugins/embeddable/public';
import { ExpressionsServiceStart, ExpressionsSetup } from '../../../expressions/public';

export interface SetupDeps {
  expressions: ExpressionsSetup;
  data: DataPublicPluginSetup;
  fieldFormats: FieldFormatsSetup;
  charts: ChartsPluginSetup;
}

export interface StartDeps {
  expression: ExpressionsServiceStart;
}

export type ExpressionXyPluginSetup = void;
export type ExpressionXyPluginStart = void;

export interface FilterEvent {
  name: 'filter';
  data: ValueClickContext['data'];
}

export interface BrushEvent {
  name: 'brush';
  data: RangeSelectContext['data'];
}

export type FormatFactory = (mapping?: SerializedFieldFormat) => IFieldFormat;

export interface OperationDescriptor extends Operation {
  hasTimeShift: boolean;
}

export type SortingHint = 'version';
export type FieldOnlyDataType = 'document' | 'ip' | 'histogram' | 'geo_point' | 'geo_shape';
export type DataType = 'string' | 'number' | 'date' | 'boolean' | FieldOnlyDataType;

export interface OperationMetadata {
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

export interface Operation extends OperationMetadata {
  // User-facing label for the operation
  label: string;
  sortingHint?: SortingHint;
}

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
  /**
   * Optional label used in visualization type search if chart switcher is expanded and for tooltips
   */
  fullLabel?: string;
  /**
   * The group the visualization belongs to
   */
  groupLabel: string;
  /**
   * The priority of the visualization in the list (global priority)
   * Higher number means higher priority. When omitted defaults to 0
   */
  sortPriority?: number;
  /**
   * Indicates if visualization is in the experimental stage.
   */
  showExperimentalBadge?: boolean;
}

export interface AccessorConfig {
  columnId: string;
  triggerIcon?: 'color' | 'disabled' | 'colorBy' | 'none' | 'invisible';
  color?: string;
  palette?: string[] | Array<{ color: string; stop: number }>;
}
