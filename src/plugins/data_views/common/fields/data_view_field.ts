/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KbnFieldType, getKbnFieldType } from '@kbn/field-types';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { DataViewFieldBase } from '@kbn/es-query';
import { EcsFlat } from '@elastic/ecs';
import type { RuntimeFieldSpec } from '../types';
import { FieldSpec, DataView } from '..';
import {
  shortenDottedString,
  isDataViewFieldSubtypeMulti,
  isDataViewFieldSubtypeNested,
  getDataViewFieldSubtypeMulti,
  getDataViewFieldSubtypeNested,
} from './utils';

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
export class DataViewField implements DataViewFieldBase {
  readonly spec: FieldSpec;
  // not writable or serialized
  /**
   * Kbn field type, used mainly for formattering.
   */
  private readonly kbnFieldType: KbnFieldType;

  /**
   * DataView constructor
   * @constructor
   * @param spec Configuration for the field
   */
  constructor(spec: FieldSpec) {
    this.spec = { ...spec, type: spec.name === '_source' ? '_source' : spec.type };

    this.kbnFieldType = getKbnFieldType(spec.type);
  }

  // writable attrs
  /**
   * Count is used for field popularity in discover.
   */
  public get count() {
    return this.spec.count || 0;
  }

  /**
   * Set count, which is used for field popularity in discover.
   * @param count count number
   */
  public set count(count: number) {
    this.spec.count = count;
  }

  public get defaultFormatter() {
    return this.spec.defaultFormatter;
  }

  /**
   * Returns runtime field definition or undefined if field is not runtime field.
   */

  public get runtimeField() {
    return this.spec.runtimeField;
  }

  /**
   * Sets runtime field definition or unsets if undefined is provided.
   * @param runtimeField runtime field definition
   */
  public set runtimeField(runtimeField: RuntimeFieldSpec | undefined) {
    this.spec.runtimeField = runtimeField;
  }

  /**
   * Script field code
   */
  public get script() {
    return this.spec.script;
  }

  /**
   * Sets scripted field painless code
   * @param script Painless code
   */
  public set script(script) {
    this.spec.script = script;
  }

  /**
   * Script field language
   */
  public get lang() {
    return this.spec.lang;
  }

  /**
   * Sets scripted field langauge.
   * @param lang Scripted field language
   */
  public set lang(lang) {
    this.spec.lang = lang;
  }

  /**
   * Returns custom label if set, otherwise undefined.
   */

  public get customLabel() {
    return this.spec.customLabel;
  }

  /**
   * Sets custom label for field, or unsets if passed undefined.
   * @param customLabel custom label value
   */
  public set customLabel(customLabel) {
    this.spec.customLabel = customLabel;
  }

  /**
   * Returns custom description if set, otherwise undefined.
   */

  public get customDescription() {
    return this.spec.customDescription;
  }

  /**
   * Sets custom description for field, or unsets if passed undefined.
   * @param customDescription custom label value
   */
  public set customDescription(customDescription) {
    this.spec.customDescription = customDescription;
  }

  /**
   * Description of field type conflicts across different indices in the same index pattern.
   */
  public get conflictDescriptions() {
    return this.spec.conflictDescriptions;
  }

  /**
   * Sets conflict descriptions for field.
   * @param conflictDescriptions conflict descriptions
   */

  public set conflictDescriptions(conflictDescriptions) {
    this.spec.conflictDescriptions = conflictDescriptions;
  }

  // read only attrs

  /**
   * Get field name
   */
  public get name() {
    return this.spec.name;
  }

  /**
   * Gets display name, calcualted based on name, custom label and shortDotsEnable.
   */

  public get displayName(): string {
    return this.spec.customLabel
      ? this.spec.customLabel
      : this.spec.shortDotsEnable
      ? shortenDottedString(this.spec.name)
      : this.spec.name;
  }

  public get ecsDescription() {
    const { description } = EcsFlat[this.name as keyof typeof EcsFlat] ?? {};
    return description || '';
  }

  /**
   * Gets field type
   */
  public get type() {
    return this.spec.type;
  }

  /**
   * Gets ES types as string array
   */

  public get esTypes() {
    return this.spec.esTypes;
  }

  /**
   * Returns true if scripted field
   */

  public get scripted() {
    return !!this.spec.scripted;
  }

  /**
   * Returns true if field is searchable
   */

  public get searchable() {
    return !!(this.spec.searchable || this.scripted);
  }

  /**
   * Returns true if field is aggregatable
   */

  public get aggregatable() {
    return !!(this.spec.aggregatable || this.scripted);
  }

  /**
   * returns true if field is a TSDB dimension field
   */
  public get timeSeriesDimension() {
    return this.spec.timeSeriesDimension || false;
  }

  /**
   * returns type of TSDB metric or undefined
   */
  public get timeSeriesMetric() {
    return this.spec.timeSeriesMetric;
  }

  /**
   * returns list of alloeed fixed intervals
   */
  public get fixedInterval() {
    return this.spec.fixedInterval;
  }

  /**
   * returns true if the field is of rolled up type
   */
  public get isRolledUpField() {
    return this.esTypes?.includes('aggregate_metric_double');
  }

  /**
   * return list of allowed time zones
   */
  public get timeZone() {
    return this.spec.timeZone;
  }
  /**
   * Returns true if field is available via doc values
   */

  public get readFromDocValues() {
    return !!(this.spec.readFromDocValues && !this.scripted);
  }

  /**
   * Returns field subtype, multi, nested, or undefined if neither
   */

  public get subType() {
    return this.spec.subType;
  }

  /**
   * Is the field part of the index mapping?
   */
  public get isMapped() {
    return this.spec.isMapped;
  }

  /**
   * Returns true if runtime field defined on data view
   */

  public get isRuntimeField() {
    return !this.isMapped && this.runtimeField !== undefined;
  }

  // not writable, not serialized

  /**
   * Returns true if field is sortable
   */
  public get sortable() {
    return (
      this.name === '_score' ||
      ((this.spec.indexed || this.aggregatable) && this.kbnFieldType.sortable)
    );
  }

  /**
   * Returns true if field is filterable
   */

  public get filterable() {
    return (
      this.name === '_id' ||
      this.scripted ||
      ((this.spec.indexed || this.searchable) && this.kbnFieldType.filterable)
    );
  }

  /**
   * Returns true if field is visualizable
   */

  public get visualizable() {
    const notVisualizableFieldTypes: string[] = [KBN_FIELD_TYPES.UNKNOWN, KBN_FIELD_TYPES.CONFLICT];
    return this.aggregatable && !notVisualizableFieldTypes.includes(this.spec.type);
  }

  /**
   * Returns true if field is Empty
   */

  public get isNull() {
    return Boolean(this.spec.isNull);
  }

  /**
   * Returns true if field is subtype nested
   */
  public isSubtypeNested() {
    return isDataViewFieldSubtypeNested(this);
  }

  /**
   * Returns true if field is subtype multi
   */

  public isSubtypeMulti() {
    return isDataViewFieldSubtypeMulti(this);
  }

  /**
   * Returns subtype nested data if exists
   */

  public getSubtypeNested() {
    return getDataViewFieldSubtypeNested(this);
  }

  /**
   * Returns subtype multi data if exists
   */

  public getSubtypeMulti() {
    return getDataViewFieldSubtypeMulti(this);
  }

  /**
   * Deletes count value. Popularity as used by discover
   */

  public deleteCount() {
    delete this.spec.count;
  }

  /**
   * JSON version of field
   */
  public toJSON() {
    return {
      count: this.count,
      script: this.script,
      lang: this.lang,
      conflictDescriptions: this.conflictDescriptions,
      name: this.name,
      type: this.type,
      esTypes: this.esTypes,
      scripted: this.scripted,
      searchable: this.searchable,
      aggregatable: this.aggregatable,
      readFromDocValues: this.readFromDocValues,
      subType: this.subType,
      customLabel: this.customLabel,
      customDescription: this.customDescription,
      defaultFormatter: this.defaultFormatter,
    };
  }

  /**
   * Get field in serialized form - fieldspec.
   * @param config provide a method to get a field formatter
   * @returns field in serialized form - field spec
   */
  public toSpec(config: ToSpecConfig = {}): FieldSpec {
    const { getFormatterForField } = config;

    const spec = {
      count: this.count,
      script: this.script,
      lang: this.lang,
      conflictDescriptions: this.conflictDescriptions,
      name: this.name,
      type: this.type,
      esTypes: this.esTypes,
      scripted: this.scripted,
      searchable: this.searchable,
      aggregatable: this.aggregatable,
      readFromDocValues: this.readFromDocValues,
      subType: this.subType,
      format: getFormatterForField ? getFormatterForField(this).toJSON() : undefined,
      customLabel: this.customLabel,
      customDescription: this.customDescription,
      shortDotsEnable: this.spec.shortDotsEnable,
      runtimeField: this.runtimeField,
      isMapped: this.isMapped,
      timeSeriesDimension: this.spec.timeSeriesDimension,
      timeSeriesMetric: this.spec.timeSeriesMetric,
      timeZone: this.spec.timeZone,
      fixedInterval: this.spec.fixedInterval,
      defaultFormatter: this.defaultFormatter,
    };

    // Filter undefined values from the spec
    return Object.fromEntries(
      Object.entries(spec).filter(([, v]) => typeof v !== 'undefined')
    ) as FieldSpec;
  }

  /**
   * Returns true if composite runtime field
   */

  public isRuntimeCompositeSubField() {
    return this.runtimeField?.type === 'composite';
  }
}
