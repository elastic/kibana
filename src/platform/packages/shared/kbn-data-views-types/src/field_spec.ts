/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { DataViewFieldBase } from '@kbn/es-query';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type { RuntimeFieldSpec } from './runtime_field';

/**
 * Map of field formats by field name
 */
export type FieldFormatMap = Record<string, SerializedFieldFormat>;

/**
 * Set of field attributes
 * @public
 * Storage of field attributes. Necessary since the field list isn't saved.
 */
export type FieldAttrs = Map<string, FieldAttrSet>;

/**
 * Field attributes that are stored on the data view
 * @public
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FieldAttrSet = {
  /**
   * Custom field label
   */
  customLabel?: string;
  /**
   * Custom field description
   */
  customDescription?: string;
  /**
   * Popularity count - used for discover
   */
  count?: number;
};

export type FieldAttrsAsObject = Record<string, FieldAttrSet>;

export type FieldSpecConflictDescriptions = Record<string, string[]>;

/**
 * Serialized version of DataViewField
 * @public
 */
export type FieldSpec = DataViewFieldBase & {
  /**
   * Popularity count is used by discover
   */
  count?: number;
  /**
   * Description of field type conflicts across indices
   */
  conflictDescriptions?: Record<string, string[]>;
  /**
   * Field formatting in serialized format
   */
  format?: SerializedFieldFormat;
  /**
   * Elasticsearch field types used by backing indices
   */
  esTypes?: string[];
  /**
   * True if field is searchable
   */
  searchable: boolean;
  /**
   * True if field is aggregatable
   */
  aggregatable: boolean;
  /**
   * True if field is empty
   */
  isNull?: boolean;

  /**
   * True if field is a computed column, used in ES|QL to distinguish from index fields
   */
  isComputedColumn?: boolean;
  /**
   * True if can be read from doc values
   */
  readFromDocValues?: boolean;
  /**
   * True if field is indexed
   */
  indexed?: boolean;
  /**
   * Custom label for field, used for display in kibana
   */
  customLabel?: string;
  /**
   * Custom description for field, used for display in kibana
   */
  customDescription?: string;
  /**
   * Runtime field definition
   */
  runtimeField?: RuntimeFieldSpec;

  /**
   * list of allowed field intervals for the field
   */
  fixedInterval?: string[];

  /**
   * List of allowed timezones for the field
   */
  timeZone?: string[];

  /**
   * set to true if field is a TSDB dimension field
   */
  timeSeriesDimension?: boolean;

  /**
   * set if field is a TSDB metric field
   */
  timeSeriesMetric?: estypes.MappingTimeSeriesMetricType;

  // not persisted

  /**
   * Whether short dots are enabled, based on uiSettings.
   */
  shortDotsEnable?: boolean;
  /**
   * Is this field in the mapping? False if a scripted or runtime field defined on the data view.
   */
  isMapped?: boolean;
  /**
   * Name of parent field for composite runtime field subfields.
   */
  parentName?: string;

  defaultFormatter?: string;

  /**
   * Indicates whether the field is a metadata field.
   */
  metadata_field?: boolean;
};

/**
 * Map of field specs by field name
 */
export type DataViewFieldMap = Record<string, FieldSpec>;
