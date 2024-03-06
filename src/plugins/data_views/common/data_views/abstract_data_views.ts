/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  FieldFormat,
  FieldFormatsStartCommon,
  SerializedFieldFormat,
} from '@kbn/field-formats-plugin/common';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { cloneDeep, findIndex, merge } from 'lodash';
import type { DataViewFieldBase } from '@kbn/es-query';
import type {
  DataViewSpec,
  FieldSpec,
  FieldFormatMap,
  RuntimeFieldSpec,
  SourceFilter,
  TypeMeta,
  RuntimeField,
} from '../types';
import { removeFieldAttrs } from './utils';
import { metaUnitsToFormatter } from './meta_units_to_formatter';

import type { DataViewAttributes, FieldAttrs, FieldAttrSet } from '..';

import type { DataViewField } from '../fields';

interface SavedObjectBody {
  fieldAttrs?: string;
  title?: string;
  timeFieldName?: string;
  fields?: string;
  sourceFilters?: string;
  fieldFormatMap?: string;
  typeMeta?: string;
  type?: string;
}

interface AbstractDataViewDeps {
  spec?: DataViewSpec;
  fieldFormats: FieldFormatsStartCommon;
  shortDotsEnable?: boolean;
  metaFields?: string[];
}

export abstract class AbstractDataView {
  /**
   * Saved object id
   */
  public id?: string;
  /**
   * Title of data view
   * @deprecated use getIndexPattern instead
   */
  public title: string = '';
  /**
   * Map of field formats by field name
   */
  public fieldFormatMap: FieldFormatMap;
  /**
   * Only used by rollup indices, used by rollup specific endpoint to load field list.
   */
  public typeMeta?: TypeMeta;

  /**
   * Timestamp field name
   */
  public timeFieldName: string | undefined;
  /**
   * Type is used to identify rollup index patterns or ES|QL data views.
   */
  public type: string | undefined;
  /**
   * List of meta fields by name
   */
  public metaFields: string[];
  /**
   * SavedObject version
   */
  public version: string | undefined;
  /**
   * Array of filters - hides fields in discover
   */
  public sourceFilters?: SourceFilter[];
  /**
   * Array of namespace ids
   */
  public namespaces: string[];
  /**
   * Original saved object body. Used to check for saved object changes.
   */
  protected originalSavedObjectBody: SavedObjectBody = {};
  /**
   * Returns true if short dot notation is enabled
   */
  protected shortDotsEnable: boolean = false;
  /**
   * FieldFormats service interface
   */
  protected fieldFormats: FieldFormatsStartCommon;
  /**
   * Map of field attributes by field name. Currently count and customLabel.
   */
  protected fieldAttrs: FieldAttrs;
  /**
   * Map of runtime field definitions by field name
   */
  protected runtimeFieldMap: Record<string, RuntimeFieldSpec>;
  /**
   * Prevents errors when index pattern exists before indices
   */
  public readonly allowNoIndex: boolean = false;
  /**
   * Name of the data view. Human readable name used to differentiate data view.
   */
  public name: string = '';

  /*
   * list of indices that the index pattern matched
   */
  public matchedIndices: string[] = [];

  protected scriptedFields: DataViewFieldBase[];

  private allowHidden: boolean = false;

  constructor(config: AbstractDataViewDeps) {
    const { spec = {}, fieldFormats, shortDotsEnable = false, metaFields = [] } = config;

    const extractedFieldAttrs = spec?.fields
      ? Object.entries(spec.fields).reduce((acc, [key, value]) => {
          const attrs: FieldAttrSet = {};
          let hasAttrs = false;

          if (value.count) {
            attrs.count = value.count;
            hasAttrs = true;
          }

          if (value.customLabel) {
            attrs.customLabel = value.customLabel;
            hasAttrs = true;
          }

          if (hasAttrs) {
            acc[key] = attrs;
          }
          return acc;
        }, {} as Record<string, FieldAttrSet>)
      : [];

    this.allowNoIndex = spec?.allowNoIndex || false;
    // CRUD operations on scripted fields need to be examined
    this.scriptedFields = spec?.fields
      ? Object.values(spec.fields).filter((field) => field.scripted)
      : [];

    // set dependencies
    this.fieldFormats = { ...fieldFormats };
    // set config
    this.shortDotsEnable = shortDotsEnable;
    this.metaFields = metaFields;

    // set values
    this.id = spec.id;
    this.fieldFormatMap = { ...spec.fieldFormats };

    this.version = spec.version;

    this.title = spec.title || '';
    this.timeFieldName = spec.timeFieldName;
    this.sourceFilters = [...(spec.sourceFilters || [])];
    this.type = spec.type;
    this.typeMeta = spec.typeMeta;
    this.fieldAttrs = cloneDeep(merge({}, extractedFieldAttrs, spec.fieldAttrs)) || {};
    this.runtimeFieldMap = cloneDeep(spec.runtimeFieldMap) || {};
    this.namespaces = spec.namespaces || [];
    this.name = spec.name || '';
    this.allowHidden = spec.allowHidden || false;
  }

  getAllowHidden = () => this.allowHidden;

  setAllowHidden = (allowHidden: boolean) => (this.allowHidden = allowHidden);

  /**
   * Get name of Data View
   */
  getName = () => (this.name ? this.name : this.title);

  /**
   * Get index pattern
   * @returns index pattern string
   */

  getIndexPattern = () => this.title;

  /**
   * Set index pattern
   * @param string index pattern string
   */

  setIndexPattern = (indexPattern: string) => {
    this.title = indexPattern;
  };

  /**
   * Get last saved saved object fields
   */
  getOriginalSavedObjectBody = () => ({ ...this.originalSavedObjectBody });

  /**
   * Reset last saved saved object fields. Used after saving.
   */
  resetOriginalSavedObjectBody = () => {
    this.originalSavedObjectBody = this.getAsSavedObjectBody();
  };

  isPersisted() {
    return typeof this.version === 'string';
  }

  /**
   * Get the source filtering configuration for that index.
   */
  getSourceFiltering() {
    return {
      excludes: (this.sourceFilters && this.sourceFilters.map((filter) => filter.value)) || [],
    };
  }

  /**
   * Get aggregation restrictions. Rollup fields can only perform a subset of aggregations.
   */

  getAggregationRestrictions() {
    return this.typeMeta?.aggs;
  }

  /**
   * Provide a field, get its formatter
   * @param field field to get formatter for
   */
  getFormatterForField(field: DataViewField | DataViewField['spec']): FieldFormat {
    const fieldFormat = this.getFormatterForFieldNoDefault(field.name);
    if (fieldFormat) {
      return fieldFormat;
    }

    const fmt = field.defaultFormatter ? metaUnitsToFormatter[field.defaultFormatter] : undefined;
    if (fmt) {
      return this.fieldFormats.getInstance(fmt.id, fmt.params);
    }

    return this.fieldFormats.getDefaultInstance(
      field.type as KBN_FIELD_TYPES,
      field.esTypes as ES_FIELD_TYPES[]
    );
  }

  /**
   * Get formatter for a given field name. Return undefined if none exists.
   * @param fieldname name of field to get formatter for
   */
  getFormatterForFieldNoDefault(fieldname: string) {
    const formatSpec = this.fieldFormatMap[fieldname];
    if (formatSpec?.id) {
      return this.fieldFormats.getInstance(formatSpec.id, formatSpec.params);
    }
  }

  /**
   * Set field attribute
   * @param fieldName name of field to set attribute on
   * @param attrName name of attribute to set
   * @param value value of attribute
   */

  protected setFieldAttrs<K extends keyof FieldAttrSet>(
    fieldName: string,
    attrName: K,
    value: FieldAttrSet[K]
  ) {
    if (!this.fieldAttrs[fieldName]) {
      this.fieldAttrs[fieldName] = {} as FieldAttrSet;
    }
    this.fieldAttrs[fieldName][attrName] = value;
  }

  /**
   * Set field custom label
   * @param fieldName name of field to set custom label on
   * @param customLabel custom label value. If undefined, custom label is removed
   */

  protected setFieldCustomLabelInternal(fieldName: string, customLabel: string | undefined | null) {
    this.setFieldAttrs(fieldName, 'customLabel', customLabel === null ? undefined : customLabel);
  }

  /**
   * Set field custom description
   * @param fieldName name of field to set custom description on
   * @param customDescription custom description value. If undefined, custom description is removed
   */

  protected setFieldCustomDescriptionInternal(
    fieldName: string,
    customDescription: string | undefined | null
  ) {
    this.setFieldAttrs(
      fieldName,
      'customDescription',
      customDescription === null ? undefined : customDescription
    );
  }

  /**
   * Set field formatter
   * @param fieldName name of field to set format on
   * @param format field format in serialized form
   */
  public readonly setFieldFormat = (fieldName: string, format: SerializedFieldFormat) => {
    this.fieldFormatMap[fieldName] = format;
  };

  /**
   * Remove field format from the field format map.
   * @param fieldName field name associated with the format for removal
   */

  public readonly deleteFieldFormat = (fieldName: string) => {
    delete this.fieldFormatMap[fieldName];
  };

  /**
   * Returns index pattern as saved object body for saving
   */
  getAsSavedObjectBody(): DataViewAttributes {
    const stringifyOrUndefined = (obj: any) => (obj ? JSON.stringify(obj) : undefined);

    return {
      fieldAttrs: stringifyOrUndefined(this.fieldAttrs),
      title: this.getIndexPattern(),
      timeFieldName: this.timeFieldName,
      sourceFilters: stringifyOrUndefined(this.sourceFilters),
      fields: stringifyOrUndefined(this.scriptedFields),
      fieldFormatMap: stringifyOrUndefined(this.fieldFormatMap),
      type: this.type!,
      typeMeta: stringifyOrUndefined(this.typeMeta),
      allowNoIndex: this.allowNoIndex ? this.allowNoIndex : undefined,
      runtimeFieldMap: stringifyOrUndefined(this.runtimeFieldMap),
      name: this.name,
      allowHidden: this.allowHidden,
    };
  }

  protected upsertScriptedFieldInternal = (field: FieldSpec) => {
    // search for scriped field with same name
    const findByName = (f: DataViewFieldBase) => f.name === field.name;

    const fieldIndex = findIndex(this.scriptedFields, findByName);

    const scriptedField: DataViewFieldBase = {
      name: field.name,
      script: field.script,
      lang: field.lang,
      type: field.type,
      scripted: field.scripted,
    };

    if (fieldIndex === -1) {
      this.scriptedFields.push(scriptedField);
    } else {
      this.scriptedFields[fieldIndex] = scriptedField;
    }
  };

  protected deleteScriptedFieldInternal = (fieldName: string) => {
    this.scriptedFields = this.scriptedFields.filter((field) => field.name !== fieldName);
  };

  /**
   * Checks if runtime field exists
   * @param name field name
   */
  hasRuntimeField(name: string): boolean {
    return !!this.runtimeFieldMap[name];
  }

  /**
   * Returns runtime field if exists
   * @param name Runtime field name
   */
  getRuntimeField(name: string): RuntimeField | null {
    if (!this.runtimeFieldMap[name]) {
      return null;
    }

    const { type, script, fields } = { ...this.runtimeFieldMap[name] };
    const runtimeField: RuntimeField = {
      type,
      script,
    };

    if (type === 'composite') {
      runtimeField.fields = fields;
    }

    return runtimeField;
  }

  /**
   * Get all runtime field definitions.
   * NOTE: this does not strip out runtime fields that match mapped field names
   * @returns map of runtime field definitions by field name
   */

  getAllRuntimeFields(): Record<string, RuntimeField> {
    return Object.keys(this.runtimeFieldMap).reduce<Record<string, RuntimeField>>(
      (acc, fieldName) => ({
        ...acc,
        [fieldName]: this.getRuntimeField(fieldName)!,
      }),
      {}
    );
  }

  protected removeRuntimeFieldInteral(name: string) {
    delete this.runtimeFieldMap[name];
  }

  protected addRuntimeFieldInteral(name: string, runtimeField: RuntimeField) {
    this.runtimeFieldMap[name] = removeFieldAttrs(runtimeField);
  }

  getFieldAttrs = () => cloneDeep(this.fieldAttrs);
}
