/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

import { KbnFieldType, getKbnFieldType } from '@kbn/field-types';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { RuntimeFieldSpec } from '../types';
import type { IFieldType } from './types';
import { FieldSpec, DataView } from '..';
import {
  shortenDottedString,
  isDataViewFieldSubtypeMulti,
  isDataViewFieldSubtypeNested,
  getDataViewFieldSubtypeMulti,
  getDataViewFieldSubtypeNested,
} from './utils';

/** @public */
export class DataViewField implements IFieldType {
  readonly spec: FieldSpec;
  // not writable or serialized
  private readonly kbnFieldType: KbnFieldType;

  constructor(spec: FieldSpec) {
    this.spec = { ...spec, type: spec.name === '_source' ? '_source' : spec.type };

    this.kbnFieldType = getKbnFieldType(spec.type);
  }

  // writable attrs
  /**
   * Count is used for field popularity
   */
  public get count() {
    return this.spec.count || 0;
  }

  public set count(count: number) {
    this.spec.count = count;
  }

  public get runtimeField() {
    return this.spec.runtimeField;
  }

  public set runtimeField(runtimeField: RuntimeFieldSpec | undefined) {
    this.spec.runtimeField = runtimeField;
  }

  /**
   * Script field code
   */
  public get script() {
    return this.spec.script;
  }

  public set script(script) {
    this.spec.script = script;
  }

  /**
   * Script field language
   */
  public get lang() {
    return this.spec.lang;
  }

  public set lang(lang) {
    this.spec.lang = lang;
  }

  public get customLabel() {
    return this.spec.customLabel;
  }

  public set customLabel(customLabel) {
    this.spec.customLabel = customLabel;
  }

  /**
   * Description of field type conflicts across different indices in the same index pattern
   */
  public get conflictDescriptions() {
    return this.spec.conflictDescriptions;
  }

  public set conflictDescriptions(conflictDescriptions) {
    this.spec.conflictDescriptions = conflictDescriptions;
  }

  // read only attrs
  public get name() {
    return this.spec.name;
  }

  public get displayName(): string {
    return this.spec.customLabel
      ? this.spec.customLabel
      : this.spec.shortDotsEnable
      ? shortenDottedString(this.spec.name)
      : this.spec.name;
  }

  public get type() {
    return this.spec.type;
  }

  public get esTypes() {
    return this.spec.esTypes;
  }

  public get scripted() {
    return !!this.spec.scripted;
  }

  public get searchable() {
    return !!(this.spec.searchable || this.scripted);
  }

  public get aggregatable() {
    return !!(this.spec.aggregatable || this.scripted);
  }

  public get readFromDocValues() {
    return !!(this.spec.readFromDocValues && !this.scripted);
  }

  public get subType() {
    return this.spec.subType;
  }

  /**
   * Is the field part of the index mapping?
   */
  public get isMapped() {
    return this.spec.isMapped;
  }

  public get isRuntimeField() {
    return !this.isMapped && this.runtimeField !== undefined;
  }

  // not writable, not serialized
  public get sortable() {
    return (
      this.name === '_score' ||
      ((this.spec.indexed || this.aggregatable) && this.kbnFieldType.sortable)
    );
  }

  public get filterable() {
    return (
      this.name === '_id' ||
      this.scripted ||
      ((this.spec.indexed || this.searchable) && this.kbnFieldType.filterable)
    );
  }

  public get visualizable() {
    const notVisualizableFieldTypes: string[] = [KBN_FIELD_TYPES.UNKNOWN, KBN_FIELD_TYPES.CONFLICT];
    return this.aggregatable && !notVisualizableFieldTypes.includes(this.spec.type);
  }

  public isSubtypeNested() {
    return isDataViewFieldSubtypeNested(this);
  }

  public isSubtypeMulti() {
    return isDataViewFieldSubtypeMulti(this);
  }

  public getSubtypeNested() {
    return getDataViewFieldSubtypeNested(this);
  }

  public getSubtypeMulti() {
    return getDataViewFieldSubtypeMulti(this);
  }

  public deleteCount() {
    delete this.spec.count;
  }

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
    };
  }

  public toSpec({
    getFormatterForField,
  }: {
    getFormatterForField?: DataView['getFormatterForField'];
  } = {}): FieldSpec {
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
      format: getFormatterForField ? getFormatterForField(this).toJSON() : undefined,
      customLabel: this.customLabel,
      shortDotsEnable: this.spec.shortDotsEnable,
      runtimeField: this.runtimeField,
      isMapped: this.isMapped,
    };
  }

  public isRuntimeCompositeSubField() {
    return this.runtimeField?.type === 'composite';
  }
}

/**
 * @deprecated Use DataViewField instead. All index pattern interfaces were renamed.
 */
export class IndexPatternField extends DataViewField {}
