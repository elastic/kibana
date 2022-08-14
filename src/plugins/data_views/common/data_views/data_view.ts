/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { DataViewBase } from '@kbn/es-query';
import type {
  FieldFormat,
  FieldFormatsStartCommon,
  SerializedFieldFormat,
} from '@kbn/field-formats-plugin/common';
import { castEsToKbnFieldTypeName, ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { CharacterNotAllowedInField } from '@kbn/kibana-utils-plugin/common';
import _, { cloneDeep, each, reject } from 'lodash';
import type { DataViewAttributes, FieldAttrs, FieldAttrSet } from '..';
import type { DataViewField, IIndexPatternFieldList } from '../fields';
import { fieldList } from '../fields';
import type {
  DataViewFieldMap,
  DataViewSpec,
  FieldConfiguration,
  FieldFormatMap,
  RuntimeField,
  RuntimeFieldSpec,
  RuntimeType,
  SourceFilter,
  TypeMeta,
} from '../types';
import { flattenHitWrapper } from './flatten_hit';
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
  /**
   * The timestamp field name.
   */
  timeFieldName: NonNullable<DataView['timeFieldName']>;
  /**
   * The timestamp field.
   */
  getTimeField: () => DataViewField;
}

/**
 * Data view class. Central kibana abstraction around multiple indices.
 */
export class DataView implements DataViewBase {
  /**
   * Saved object id
   */
  public id?: string;
  /**
   * Title of data view
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
   * Field list, in extended array format
   */
  public fields: IIndexPatternFieldList & { toSpec: () => DataViewFieldMap };
  /**
   * Timestamp field name
   */
  public timeFieldName: string | undefined;
  /**
   * Type is used to identify rollup index patterns.
   */
  public type: string | undefined;
  /**
   * @deprecated Use `flattenHit` utility method exported from data plugin instead.
   */
  public flattenHit: (hit: Record<string, unknown[]>, deep?: boolean) => Record<string, unknown>;
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
  private originalSavedObjectBody: SavedObjectBody = {};
  /**
   * Returns true if short dot notation is enabled
   */
  private shortDotsEnable: boolean = false;
  /**
   * FieldFormats service interface
   */
  private fieldFormats: FieldFormatsStartCommon;
  /**
   * Map of field attributes by field name. Currently count and customLabel.
   */
  private fieldAttrs: FieldAttrs;
  /**
   * Map of runtime field definitions by field name
   */
  private runtimeFieldMap: Record<string, RuntimeFieldSpec>;
  /**
   * Prevents errors when index pattern exists before indices
   */
  public readonly allowNoIndex: boolean = false;
  /**
   * Name of the data view. Human readable name used to differentiate data view.
   */
  public name: string = '';

  /**
   * constructor
   * @param config - config data and dependencies
   */

  constructor(config: DataViewDeps) {
    const { spec = {}, fieldFormats, shortDotsEnable = false, metaFields = [] } = config;

    // set dependencies
    this.fieldFormats = { ...fieldFormats };
    // set config
    this.shortDotsEnable = shortDotsEnable;
    this.metaFields = metaFields;
    // initialize functionality
    this.fields = fieldList([], this.shortDotsEnable);

    this.flattenHit = flattenHitWrapper(this, metaFields);

    // set values
    this.id = spec.id;
    this.fieldFormatMap = { ...spec.fieldFormats };

    this.version = spec.version;

    this.title = spec.title || '';
    this.timeFieldName = spec.timeFieldName;
    this.sourceFilters = [...(spec.sourceFilters || [])];
    this.fields.replaceAll(Object.values(spec.fields || {}));
    this.type = spec.type;
    this.typeMeta = spec.typeMeta;
    this.fieldAttrs = cloneDeep(spec.fieldAttrs) || {};
    this.allowNoIndex = spec.allowNoIndex || false;
    this.runtimeFieldMap = cloneDeep(spec.runtimeFieldMap) || {};
    this.namespaces = spec.namespaces || [];
    this.name = spec.name || '';
  }

  /**
   * Get name of Data View
   */
  getName = () => (this.name ? this.name : this.title);

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

  /**
   * Returns field attributes map
   */
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

  /**
   * Returns scripted fields
   */

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

    // Date value returned in "_source" could be in a number of formats
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

  isPersisted() {
    return typeof this.version === 'string';
  }

  /**
   * Creates static representation of the data view.
   * @param includeFields Whether or not to include the `fields` list as part of this spec. If not included, the list
   * will be fetched from Elasticsearch when instantiating a new Data View with this spec.
   */
  public toSpec(includeFields = true): DataViewSpec {
    const fields =
      includeFields && this.fields
        ? this.fields.toSpec({ getFormatterForField: this.getFormatterForField.bind(this) })
        : undefined;

    const spec: DataViewSpec = {
      id: this.id,
      version: this.version,
      title: this.title,
      timeFieldName: this.timeFieldName,
      sourceFilters: [...(this.sourceFilters || [])],
      fields,
      typeMeta: this.typeMeta,
      type: this.type,
      fieldFormats: { ...this.fieldFormatMap },
      runtimeFieldMap: cloneDeep(this.runtimeFieldMap),
      fieldAttrs: cloneDeep(this.fieldAttrs),
      allowNoIndex: this.allowNoIndex,
      name: this.name,
    };

    // Filter undefined values from the spec
    return Object.fromEntries(Object.entries(spec).filter(([, v]) => typeof v !== 'undefined'));
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
   * Removes scripted field from field list.
   * @param fieldName name of scripted field to remove
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
   * @deprecated Will be removed when scripted fields are removed.
   */
  getNonScriptedFields() {
    return [...this.fields.getAll().filter((field) => !field.scripted)];
  }

  /**
   *
   * @deprecated Use runtime field instead.
   */
  getScriptedFields() {
    return [...this.fields.getAll().filter((field) => field.scripted)];
  }

  /**
   * returns true if dataview contains TSDB fields
   */
  isTSDBMode() {
    return this.fields.some((field) => field.timeSeriesDimension || field.timeSeriesMetric);
  }

  /**
   * Does the data view have a timestamp field?
   */

  isTimeBased(): this is TimeBasedDataView {
    return !!this.timeFieldName && (!this.fields || !!this.getTimeField());
  }

  /**
   * Does the data view have a timestamp field and is it a date nanos field?
   */

  isTimeNanosBased(): this is TimeBasedDataView {
    const timeField = this.getTimeField();
    return !!(timeField && timeField.esTypes && timeField.esTypes.indexOf('date_nanos') !== -1);
  }

  /**
   * Get timestamp field as DataViewField or return undefined
   */
  getTimeField() {
    if (!this.timeFieldName || !this.fields || !this.fields.getByName) return undefined;
    return this.fields.getByName(this.timeFieldName);
  }

  /**
   * Get field by name.
   * @param name field name
   */

  getFieldByName(name: string): DataViewField | undefined {
    if (!this.fields || !this.fields.getByName) return undefined;
    return this.fields.getByName(name);
  }

  /**
   * Get aggregation restrictions. Rollup fields can only perform a subset of aggregations.
   */

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
      name: this.name,
    };
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

  /**
   * Returns data view fields backed by runtime fields.
   * @param name runtime field name
   * @returns map of DataViewFields (that are runtime fields) by field name
   */

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
   * Replaces all existing runtime fields with new fields.
   * @param newFields Map of runtime field definitions by field name
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
   * Return the "runtime_mappings" section of the ES search query.
   */
  getRuntimeMappings(): estypes.MappingRuntimeFields {
    const mappedFields = this.getMappedFieldNames();
    const records = Object.keys(this.runtimeFieldMap).reduce<Record<string, RuntimeFieldSpec>>(
      (acc, fieldName) => {
        // do not include fields that are mapped
        if (!mappedFields.includes(fieldName)) {
          acc[fieldName] = this.runtimeFieldMap[fieldName];
        }

        return acc;
      },
      {}
    );
    return records as estypes.MappingRuntimeFields;
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

  public setFieldCustomLabel(fieldName: string, customLabel: string | undefined | null) {
    const fieldObject = this.fields.getByName(fieldName);
    const newCustomLabel: string | undefined = customLabel === null ? undefined : customLabel;

    if (fieldObject) {
      fieldObject.customLabel = newCustomLabel;
    }

    this.setFieldAttrs(fieldName, 'customLabel', newCustomLabel);
  }

  /**
   * Set field count
   * @param fieldName name of field to set count on
   * @param count count value. If undefined, count is removed
   */

  public setFieldCount(fieldName: string, count: number | undefined | null) {
    const fieldObject = this.fields.getByName(fieldName);
    const newCount: number | undefined = count === null ? undefined : count;

    if (fieldObject) {
      if (!newCount) fieldObject.deleteCount();
      else fieldObject.count = newCount;
    }
    this.setFieldAttrs(fieldName, 'count', newCount);
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

  private getMappedFieldNames() {
    return this.fields.getAll().reduce<string[]>((acc, dataViewField) => {
      if (dataViewField.isMapped) {
        acc.push(dataViewField.name);
      }
      return acc;
    }, []);
  }

  /**
   * Add composite runtime field and all subfields.
   * @param name field name
   * @param runtimeField runtime field definition
   * @returns data view field instance
   */

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
