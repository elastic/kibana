/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewFieldBase } from '@kbn/es-query';
import type { RuntimeFieldSpec } from '../types';
import type { FieldSpec, DataView } from '..';
/**
 * Optional format getter when serializing a field
 * @public
 */
export interface ToSpecConfig {
  /**
   * Field format getter
   */
  getFormatterForField?: DataView['getFormatterForField'];
}
/**
 * Data view field class
 * @public
 */
export declare class DataViewField implements DataViewFieldBase {
  readonly spec: FieldSpec;
  /**
   * Kbn field type, used mainly for formattering.
   */
  private readonly kbnFieldType;
  /**
   * DataView constructor
   * @constructor
   * @param spec Configuration for the field
   */
  constructor(spec: FieldSpec);
  /**
   * Count is used for field popularity in discover.
   */
  get count(): number;
  /**
   * Set count, which is used for field popularity in discover.
   * @param count count number
   */
  set count(count: number);
  get defaultFormatter(): string | undefined;
  /**
   * Returns runtime field definition or undefined if field is not runtime field.
   */
  get runtimeField(): RuntimeFieldSpec | undefined;
  /**
   * Sets runtime field definition or unsets if undefined is provided.
   * @param runtimeField runtime field definition
   */
  set runtimeField(runtimeField: RuntimeFieldSpec | undefined);
  /**
   * Script field code
   */
  get script(): string | undefined;
  /**
   * Sets scripted field painless code
   * @param script Painless code
   */
  set script(script: string | undefined);
  /**
   * Script field language
   */
  get lang(): string | undefined;
  /**
   * Sets scripted field langauge.
   * @param lang Scripted field language
   */
  set lang(lang: string | undefined);
  /**
   * Returns custom label if set, otherwise undefined.
   */
  get customLabel(): string | undefined;
  /**
   * Sets custom label for field, or unsets if passed undefined.
   * @param customLabel custom label value
   */
  set customLabel(customLabel: string | undefined);
  /**
   * Returns custom description if set, otherwise undefined.
   */
  get customDescription(): string | undefined;
  /**
   * Sets custom description for field, or unsets if passed undefined.
   * @param customDescription custom label value
   */
  set customDescription(customDescription: string | undefined);
  /**
   * Description of field type conflicts across different indices in the same index pattern.
   */
  get conflictDescriptions(): Record<string, string[]> | undefined;
  /**
   * Sets conflict descriptions for field.
   * @param conflictDescriptions conflict descriptions
   */
  set conflictDescriptions(conflictDescriptions: Record<string, string[]> | undefined);
  /**
   * Get field name
   */
  get name(): string;
  /**
   * Gets display name, calcualted based on name, custom label and shortDotsEnable.
   */
  get displayName(): string;
  /**
   * Gets field type
   */
  get type(): string;
  /**
   * Gets ES types as string array
   */
  get esTypes(): string[] | undefined;
  /**
   * Returns true if scripted field
   */
  get scripted(): boolean;
  /**
   * Returns true if field is searchable
   */
  get searchable(): boolean;
  /**
   * Returns true if field is aggregatable
   */
  get aggregatable(): boolean;
  /**
   * returns true if field is a TSDB dimension field
   */
  get timeSeriesDimension(): boolean;
  /**
   * returns type of TSDB metric or undefined
   */
  get timeSeriesMetric():
    | import('@elastic/elasticsearch/lib/api/types').MappingTimeSeriesMetricType
    | undefined;
  /**
   * returns list of alloeed fixed intervals
   */
  get fixedInterval(): string[] | undefined;
  /**
   * returns true if the field is of rolled up type
   */
  get isRolledUpField(): boolean | undefined;
  /**
   * return list of allowed time zones
   */
  get timeZone(): string[] | undefined;
  /**
   * Returns true if field is available via doc values
   */
  get readFromDocValues(): boolean;
  /**
   * Returns field subtype, multi, nested, or undefined if neither
   */
  get subType(): import('@kbn/es-query').IFieldSubType | undefined;
  /**
   * Is the field part of the index mapping?
   */
  get isMapped(): boolean | undefined;
  /**
   * Returns true if runtime field defined on data view
   */
  get isRuntimeField(): boolean;
  /**
   * Returns true if field is sortable
   */
  get sortable(): boolean;
  /**
   * Returns true if field is filterable
   */
  get filterable(): boolean;
  /**
   * Returns true if field is visualizable
   */
  get visualizable(): boolean;
  /**
   * Returns true if field is Empty
   */
  get isNull(): boolean;
  /**
   * Returns true if the field is not part of the index and is a computed column
   */
  get isComputedColumn(): boolean;
  /**
   * Returns true if field is subtype nested
   */
  isSubtypeNested(): boolean;
  /**
   * Returns true if field is subtype multi
   */
  isSubtypeMulti(): boolean;
  /**
   * Returns subtype nested data if exists
   */
  getSubtypeNested(): import('@kbn/es-query').IFieldSubTypeNested | undefined;
  /**
   * Returns subtype multi data if exists
   */
  getSubtypeMulti(): import('@kbn/es-query').IFieldSubTypeMulti | undefined;
  /**
   * Deletes count value. Popularity as used by discover
   */
  deleteCount(): void;
  /**
   * JSON version of field
   */
  toJSON(): {
    count: number;
    script: string | undefined;
    lang: string | undefined;
    conflictDescriptions: Record<string, string[]> | undefined;
    name: string;
    type: string;
    esTypes: string[] | undefined;
    scripted: boolean;
    searchable: boolean;
    aggregatable: boolean;
    readFromDocValues: boolean;
    subType: import('@kbn/es-query').IFieldSubType | undefined;
    customLabel: string | undefined;
    customDescription: string | undefined;
    defaultFormatter: string | undefined;
  };
  /**
   * Get field in serialized form - fieldspec.
   * @param config provide a method to get a field formatter
   * @returns field in serialized form - field spec
   */
  toSpec(config?: ToSpecConfig): FieldSpec;
  /**
   * Returns true if composite runtime field
   */
  isRuntimeCompositeSubField(): boolean;
}
