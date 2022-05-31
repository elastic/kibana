/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

import _, { each, reject } from 'lodash';
import { castEsToKbnFieldTypeName, ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { CharacterNotAllowedInField } from '@kbn/kibana-utils-plugin/common';
import {
  FieldFormatsStartCommon,
  FieldFormat,
  SerializedFieldFormat,
} from '@kbn/field-formats-plugin/common';
import { FieldAttrs, FieldAttrSet, DataViewAttributes } from '..';
import type { RuntimeField, RuntimeFieldSpec, RuntimeType, FieldConfiguration } from '../types';

import { IIndexPattern, IFieldType } from '..';
import { DataViewField, IIndexPatternFieldList, fieldList } from '../fields';
import { flattenHitWrapper } from './flatten_hit';
import { DataViewSpec, TypeMeta, SourceFilter, DataViewFieldMap } from '../types';
import { removeFieldAttrs } from './utils';

interface DataViewDeps {
  spec?: DataViewSpec;
  fieldFormats: FieldFormatsStartCommon;
  shortDotsEnable?: boolean;
  metaFields?: string[];
}

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

/**
 * An interface representing a data view that is time based.
 */
export interface TimeBasedDataView extends DataView {
  timeFieldName: NonNullable<DataView['timeFieldName']>;
  getTimeField: () => DataViewField;
}

export class DataView implements IIndexPattern {
  public id?: string;
  public title: string = '';
  public fieldFormatMap: Record<string, any>;
  /**
   * Only used by rollup indices, used by rollup specific endpoint to load field list
   */
  public typeMeta?: TypeMeta;
  public fields: IIndexPatternFieldList & { toSpec: () => DataViewFieldMap };
  public timeFieldName: string | undefined;
  /**
   * Type is used to identify rollup index patterns
   */
  public type: string | undefined;
  /**
   * @deprecated Use `flattenHit` utility method exported from data plugin instead.
   */
  public flattenHit: (hit: Record<string, any>, deep?: boolean) => Record<string, any>;
  public metaFields: string[];
  /**
   * SavedObject version
   */
  public version: string | undefined;
  public sourceFilters?: SourceFilter[];
  public namespaces: string[];
  private originalSavedObjectBody: SavedObjectBody = {};
  private shortDotsEnable: boolean = false;
  private fieldFormats: FieldFormatsStartCommon;
  private fieldAttrs: FieldAttrs;
  private runtimeFieldMap: Record<string, RuntimeFieldSpec>;

  /**
   * prevents errors when index pattern exists before indices
   */
  public readonly allowNoIndex: boolean = false;

  constructor({ spec = {}, fieldFormats, shortDotsEnable = false, metaFields = [] }: DataViewDeps) {
    // set dependencies
    this.fieldFormats = fieldFormats;
    // set config
    this.shortDotsEnable = shortDotsEnable;
    this.metaFields = metaFields;
    // initialize functionality
    this.fields = fieldList([], this.shortDotsEnable);

    this.flattenHit = flattenHitWrapper(this, metaFields);

    // set values
    this.id = spec.id;
    this.fieldFormatMap = spec.fieldFormats || {};

    this.version = spec.version;

    this.title = spec.title || '';
    this.timeFieldName = spec.timeFieldName;
    this.sourceFilters = spec.sourceFilters;
    this.fields.replaceAll(Object.values(spec.fields || {}));
    this.type = spec.type;
    this.typeMeta = spec.typeMeta;
    this.fieldAttrs = spec.fieldAttrs || {};
    this.allowNoIndex = spec.allowNoIndex || false;
    this.runtimeFieldMap = spec.runtimeFieldMap || {};
    this.namespaces = spec.namespaces || [];
  }

  /**
   * Get last saved saved object fields
   */
  getOriginalSavedObjectBody = () => ({ ...this.originalSavedObjectBody });

  /**
   * Reset last saved saved object fields. used after saving
   */
  resetOriginalSavedObjectBody = () => {
    this.originalSavedObjectBody = this.getAsSavedObjectBody();
  };

  getFieldAttrs = () => {
    const newFieldAttrs = { ...this.fieldAttrs };

    this.fields.forEach((field) => {
      const attrs: FieldAttrSet = {};
      let hasAttr = false;
      if (field.customLabel) {
        attrs.customLabel = field.customLabel;
        hasAttr = true;
      }
      if (field.count) {
        attrs.count = field.count;
        hasAttr = true;
      }

      if (hasAttr) {
        newFieldAttrs[field.name] = attrs;
      } else {
        delete newFieldAttrs[field.name];
      }
    });

    return newFieldAttrs;
  };

  getComputedFields() {
    const scriptFields: Record<string, estypes.ScriptField> = {};
    if (!this.fields) {
      return {
        storedFields: ['*'],
        scriptFields,
        docvalueFields: [] as Array<{ field: string; format: string }>,
        runtimeFields: {},
      };
    }

    // Date value returned in "_source" could be in any number of formats
    // Use a docvalue for each date field to ensure standardized formats when working with date fields
    // dataView.flattenHit will override "_source" values when the same field is also defined in "fields"
    const docvalueFields = reject(this.fields.getByType('date'), 'scripted').map((dateField) => {
      return {
        field: dateField.name,
        format:
          dateField.esTypes && dateField.esTypes.indexOf('date_nanos') !== -1
            ? 'strict_date_time'
            : 'date_time',
      };
    });

    each(this.getScriptedFields(), function (field) {
      scriptFields[field.name] = {
        script: {
          source: field.script as string,
          lang: field.lang,
        },
      };
    });

    const runtimeFields = this.getRuntimeMappings();

    return {
      storedFields: ['*'],
      scriptFields,
      docvalueFields,
      runtimeFields,
    };
  }

  /**
   * Create static representation of index pattern
   */
  public toSpec(): DataViewSpec {
    return {
      id: this.id,
      version: this.version,

      title: this.title,
      timeFieldName: this.timeFieldName,
      sourceFilters: this.sourceFilters,
      fields: this.fields.toSpec({ getFormatterForField: this.getFormatterForField.bind(this) }),
      typeMeta: this.typeMeta,
      type: this.type,
      fieldFormats: this.fieldFormatMap,
      runtimeFieldMap: this.runtimeFieldMap,
      fieldAttrs: this.fieldAttrs,
      allowNoIndex: this.allowNoIndex,
    };
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
   * Remove scripted field from field list
   * @param fieldName
   * @deprecated use runtime field instead
   */

  removeScriptedField(fieldName: string) {
    const field = this.fields.getByName(fieldName);
    if (field) {
      this.fields.remove(field);
    }
  }

  /**
   *
   * @deprecated Will be removed when scripted fields are removed
   */
  getNonScriptedFields() {
    return [...this.fields.getAll().filter((field) => !field.scripted)];
  }

  /**
   *
   * @deprecated use runtime field instead
   */
  getScriptedFields() {
    return [...this.fields.getAll().filter((field) => field.scripted)];
  }

  isTimeBased(): this is TimeBasedDataView {
    return !!this.timeFieldName && (!this.fields || !!this.getTimeField());
  }

  isTimeNanosBased(): this is TimeBasedDataView {
    const timeField = this.getTimeField();
    return !!(timeField && timeField.esTypes && timeField.esTypes.indexOf('date_nanos') !== -1);
  }

  getTimeField() {
    if (!this.timeFieldName || !this.fields || !this.fields.getByName) return undefined;
    return this.fields.getByName(this.timeFieldName);
  }

  getFieldByName(name: string): DataViewField | undefined {
    if (!this.fields || !this.fields.getByName) return undefined;
    return this.fields.getByName(name);
  }

  getAggregationRestrictions() {
    return this.typeMeta?.aggs;
  }

  /**
   * Returns index pattern as saved object body for saving
   */
  getAsSavedObjectBody(): DataViewAttributes {
    const fieldFormatMap = _.isEmpty(this.fieldFormatMap)
      ? undefined
      : JSON.stringify(this.fieldFormatMap);
    const fieldAttrs = this.getFieldAttrs();
    const runtimeFieldMap = this.runtimeFieldMap;

    return {
      fieldAttrs: fieldAttrs ? JSON.stringify(fieldAttrs) : undefined,
      title: this.title,
      timeFieldName: this.timeFieldName,
      sourceFilters: this.sourceFilters ? JSON.stringify(this.sourceFilters) : undefined,
      fields: JSON.stringify(this.fields?.filter((field) => field.scripted) ?? []),
      fieldFormatMap,
      type: this.type!,
      typeMeta: JSON.stringify(this.typeMeta ?? {}),
      allowNoIndex: this.allowNoIndex ? this.allowNoIndex : undefined,
      runtimeFieldMap: runtimeFieldMap ? JSON.stringify(runtimeFieldMap) : undefined,
    };
  }

  /**
   * Provide a field, get its formatter
   * @param field
   */
  getFormatterForField(field: DataViewField | DataViewField['spec'] | IFieldType): FieldFormat {
    const fieldFormat = this.getFormatterForFieldNoDefault(field.name);
    if (fieldFormat) {
      return fieldFormat;
    }

    return this.fieldFormats.getDefaultInstance(
      field.type as KBN_FIELD_TYPES,
      field.esTypes as ES_FIELD_TYPES[]
    );
  }

  /**
   * Add a runtime field - Appended to existing mapped field or a new field is
   * created as appropriate.
   * @param name Field name
   * @param runtimeField Runtime field definition
   */
  addRuntimeField(name: string, runtimeField: RuntimeField): DataViewField[] {
    if (name.includes('*')) {
      throw new CharacterNotAllowedInField('*', name);
    }

    const { type, script, customLabel, format, popularity } = runtimeField;

    if (type === 'composite') {
      return this.addCompositeRuntimeField(name, runtimeField);
    }

    this.runtimeFieldMap[name] = removeFieldAttrs(runtimeField);
    const field = this.updateOrAddRuntimeField(
      name,
      type,
      { type, script },
      {
        customLabel,
        format,
        popularity,
      }
    );

    return [field];
  }

  /**
   * Checks if runtime field exists
   * @param name
   */
  hasRuntimeField(name: string): boolean {
    return !!this.runtimeFieldMap[name];
  }

  /**
   * Returns runtime field if exists
   * @param name
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

  getAllRuntimeFields(): Record<string, RuntimeField> {
    return Object.keys(this.runtimeFieldMap).reduce<Record<string, RuntimeField>>(
      (acc, fieldName) => ({
        ...acc,
        [fieldName]: this.getRuntimeField(fieldName)!,
      }),
      {}
    );
  }

  getFieldsByRuntimeFieldName(name: string): Record<string, DataViewField> | undefined {
    const runtimeField = this.getRuntimeField(name);
    if (!runtimeField) {
      return;
    }

    if (runtimeField.type === 'composite') {
      return Object.entries(runtimeField.fields!).reduce<Record<string, DataViewField>>(
        (acc, [subFieldName, subField]) => {
          const fieldFullName = `${name}.${subFieldName}`;
          const dataViewField = this.getFieldByName(fieldFullName);

          if (!dataViewField) {
            // We should never enter here as all composite runtime subfield
            // are converted to data view fields.
            return acc;
          }
          acc[subFieldName] = dataViewField;
          return acc;
        },
        {}
      );
    }

    const primitveRuntimeField = this.getFieldByName(name);

    return primitveRuntimeField && { [name]: primitveRuntimeField };
  }

  /**
   * Replaces all existing runtime fields with new fields
   * @param newFields
   */
  replaceAllRuntimeFields(newFields: Record<string, RuntimeField>) {
    const oldRuntimeFieldNames = Object.keys(this.runtimeFieldMap);
    oldRuntimeFieldNames.forEach((name) => {
      this.removeRuntimeField(name);
    });

    Object.entries(newFields).forEach(([name, field]) => {
      this.addRuntimeField(name, field);
    });
  }

  /**
   * Remove a runtime field - removed from mapped field or removed unmapped
   * field as appropriate. Doesn't clear associated field attributes.
   * @param name - Field name to remove
   */
  removeRuntimeField(name: string) {
    const existingField = this.getFieldByName(name);

    if (existingField && existingField.isMapped) {
      // mapped field, remove runtimeField def
      existingField.runtimeField = undefined;
    } else {
      Object.values(this.getFieldsByRuntimeFieldName(name) || {}).forEach((field) => {
        this.fields.remove(field);
      });
    }
    delete this.runtimeFieldMap[name];
  }

  /**
   * Return the "runtime_mappings" section of the ES search query
   */
  getRuntimeMappings(): estypes.MappingRuntimeFields {
    // @ts-expect-error The ES client does not yet include the "composite" runtime type
    return _.cloneDeep(this.runtimeFieldMap);
  }

  /**
   * Get formatter for a given field name. Return undefined if none exists
   * @param field
   */
  getFormatterForFieldNoDefault(fieldname: string) {
    const formatSpec = this.fieldFormatMap[fieldname];
    if (formatSpec?.id) {
      return this.fieldFormats.getInstance(formatSpec.id, formatSpec.params);
    }
  }

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

  public setFieldCustomLabel(fieldName: string, customLabel: string | undefined | null) {
    const fieldObject = this.fields.getByName(fieldName);
    const newCustomLabel: string | undefined = customLabel === null ? undefined : customLabel;

    if (fieldObject) {
      fieldObject.customLabel = newCustomLabel;
    }

    this.setFieldAttrs(fieldName, 'customLabel', newCustomLabel);
  }

  public setFieldCount(fieldName: string, count: number | undefined | null) {
    const fieldObject = this.fields.getByName(fieldName);
    const newCount: number | undefined = count === null ? undefined : count;

    if (fieldObject) {
      if (!newCount) fieldObject.deleteCount();
      else fieldObject.count = newCount;
    }
    this.setFieldAttrs(fieldName, 'count', newCount);
  }

  public readonly setFieldFormat = (fieldName: string, format: SerializedFieldFormat) => {
    this.fieldFormatMap[fieldName] = format;
  };

  public readonly deleteFieldFormat = (fieldName: string) => {
    delete this.fieldFormatMap[fieldName];
  };

  private addCompositeRuntimeField(name: string, runtimeField: RuntimeField): DataViewField[] {
    const { fields } = runtimeField;

    // Make sure subFields are provided
    if (fields === undefined || Object.keys(fields).length === 0) {
      throw new Error(`Can't add composite runtime field [name = ${name}] without subfields.`);
    }

    // Make sure no field with the same name already exist
    if (this.getFieldByName(name) !== undefined) {
      throw new Error(
        `Can't create composite runtime field ["${name}"] as there is already a field with this name`
      );
    }

    // We first remove the runtime composite field with the same name which will remove all of its subFields.
    // This guarantees that we don't leave behind orphan data view fields
    this.removeRuntimeField(name);

    const runtimeFieldSpec = removeFieldAttrs(runtimeField);

    // We don't add composite runtime fields to the field list as
    // they are not fields but **holder** of fields.
    // What we do add to the field list are all their subFields.
    const dataViewFields = Object.entries(fields).map(([subFieldName, subField]) =>
      // Every child field gets the complete runtime field script for consumption by searchSource
      this.updateOrAddRuntimeField(`${name}.${subFieldName}`, subField.type, runtimeFieldSpec, {
        customLabel: subField.customLabel,
        format: subField.format,
        popularity: subField.popularity,
      })
    );

    this.runtimeFieldMap[name] = removeFieldAttrs(runtimeField);
    return dataViewFields;
  }

  private updateOrAddRuntimeField(
    fieldName: string,
    fieldType: RuntimeType,
    runtimeFieldSpec: RuntimeFieldSpec,
    config: FieldConfiguration
  ): DataViewField {
    if (fieldType === 'composite') {
      throw new Error(
        `Trying to add composite field as primmitive field, this shouldn't happen! [name = ${fieldName}]`
      );
    }

    // Create the field if it does not exist or update an existing one
    let createdField: DataViewField | undefined;
    const existingField = this.getFieldByName(fieldName);

    if (existingField) {
      existingField.runtimeField = runtimeFieldSpec;
    } else {
      createdField = this.fields.add({
        name: fieldName,
        runtimeField: runtimeFieldSpec,
        type: castEsToKbnFieldTypeName(fieldType),
        esTypes: [fieldType],
        aggregatable: true,
        searchable: true,
        count: config.popularity ?? 0,
        readFromDocValues: false,
      });
    }

    // Apply configuration to the field
    if (config.customLabel || config.customLabel === null) {
      this.setFieldCustomLabel(fieldName, config.customLabel);
    }

    if (config.popularity || config.popularity === null) {
      this.setFieldCount(fieldName, config.popularity);
    }

    if (config.format) {
      this.setFieldFormat(fieldName, config.format);
    } else if (config.format === null) {
      this.deleteFieldFormat(fieldName);
    }

    return createdField ?? existingField!;
  }
}

/**
 * @deprecated Use DataView instead. All index pattern interfaces were renamed.
 */
export class IndexPattern extends DataView {}
