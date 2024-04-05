/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import { castEsToKbnFieldTypeName } from '@kbn/field-types';
import { CharacterNotAllowedInField } from '@kbn/kibana-utils-plugin/common';
import type { DataViewBase } from '@kbn/es-query';
import { each, mapValues, pick, pickBy, reject } from 'lodash';
import type { DataViewField, IIndexPatternFieldList } from '../fields';
import { fieldList } from '../fields';
import type {
  DataViewFieldMap,
  DataViewSpec,
  FieldConfiguration,
  RuntimeField,
  RuntimeFieldSpec,
  RuntimeType,
  FieldSpec,
} from '../types';
import { removeFieldAttrs } from './utils';
import { AbstractDataView } from './abstract_data_views';
import { flattenHitWrapper } from './flatten_hit';

interface DataViewDeps {
  spec?: DataViewSpec;
  fieldFormats: FieldFormatsStartCommon;
  shortDotsEnable?: boolean;
  metaFields?: string[];
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
export class DataView extends AbstractDataView implements DataViewBase {
  /**
   * Field list, in extended array format
   */
  public fields: IIndexPatternFieldList & { toSpec: () => DataViewFieldMap };
  /**
   * @deprecated Use `flattenHit` utility method exported from data plugin instead.
   */
  public flattenHit: (hit: Record<string, unknown[]>, deep?: boolean) => Record<string, unknown>;

  private etag: string | undefined;

  /**
   * constructor
   * @param config - config data and dependencies
   */

  constructor(config: DataViewDeps) {
    super(config);
    const { spec = {}, metaFields } = config;

    this.fields = fieldList([], this.shortDotsEnable);
    this.flattenHit = flattenHitWrapper(this, metaFields);

    // set values
    this.fields.replaceAll(Object.values(spec.fields || {}));
    if (this.fields.getByName('ecs.version') !== undefined) {
      this.hasEcsFields = true;
    }
  }

  getScriptedFieldsForQuery() {
    return this.getScriptedFields().reduce((scriptFields, field) => {
      scriptFields[field.name] = {
        script: {
          source: field.script as string,
          lang: field.lang,
        },
      };
      return scriptFields;
    }, {} as Record<string, estypes.ScriptField>);
  }

  getEtag = () => this.etag;

  setEtag = (etag: string | undefined) => (this.etag = etag);

  /**
   * Returns scripted fields
   */

  getComputedFields() {
    const scriptFields: Record<string, estypes.ScriptField> = {};
    if (!this.fields) {
      return {
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

    return {
      scriptFields: this.getScriptedFieldsForQuery(),
      docvalueFields,
      runtimeFields: this.getRuntimeMappings(),
    };
  }

  /**
   * Creates static representation of the data view.
   * @param includeFields Whether or not to include the `fields` list as part of this spec. If not included, the list
   * will be fetched from Elasticsearch when instantiating a new Data View with this spec.
   */
  public toSpec(includeFields = true): DataViewSpec {
    const spec = this.toSpecShared(includeFields);
    const fields =
      includeFields && this.fields
        ? this.fields.toSpec({ getFormatterForField: this.getFormatterForField.bind(this) })
        : undefined;

    if (fields) {
      spec.fields = fields;
    }

    return spec;
  }

  /**
   * Creates a minimal static representation of the data view. Fields and popularity scores will be omitted.
   */
  public toMinimalSpec(params?: {
    keepFieldAttrs?: Array<'customLabel' | 'customDescription'>;
  }): Omit<DataViewSpec, 'fields'> {
    const fieldAttrsToKeep = params?.keepFieldAttrs ?? ['customLabel', 'customDescription'];

    // removes `fields`
    const dataViewSpec = this.toSpec(false);

    // removes `fieldAttrs` attributes that are not in `fieldAttrsToKeep`
    if (dataViewSpec.fieldAttrs) {
      dataViewSpec.fieldAttrs = pickBy(
        // removes unnecessary attributes
        mapValues(dataViewSpec.fieldAttrs, (fieldAttrs) => pick(fieldAttrs, fieldAttrsToKeep)),
        // removes empty objects if all attributes have been removed
        (trimmedFieldAttrs) => Object.keys(trimmedFieldAttrs).length > 0
      );

      // removes `fieldAttrs` if it's empty
      if (Object.keys(dataViewSpec.fieldAttrs).length === 0) {
        dataViewSpec.fieldAttrs = undefined;
      }
    }

    return dataViewSpec;
  }

  /**
   * Removes scripted field from field list.
   * @param fieldName name of scripted field to remove
   * @deprecated use runtime field instead
   */

  removeScriptedField(fieldName: string) {
    this.deleteScriptedFieldInternal(fieldName);
    const field = this.fields.getByName(fieldName);
    if (field && field.scripted) {
      this.fields.remove(field);
    } else {
      throw new Error(`Scripted field ${fieldName} does not exist in data view ${this.getName()}`);
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
   * Add a runtime field - Appended to existing mapped field or a new field is
   * created as appropriate.
   * @param name Field name
   * @param runtimeField Runtime field definition
   */
  addRuntimeField(name: string, runtimeField: RuntimeField): DataViewField[] {
    if (name.includes('*')) {
      throw new CharacterNotAllowedInField('*', name);
    }

    const { type, script, customLabel, customDescription, format, popularity } = runtimeField;

    if (type === 'composite') {
      return this.addCompositeRuntimeField(name, runtimeField);
    }

    this.addRuntimeFieldInteral(name, runtimeField);
    const field = this.updateOrAddRuntimeField(
      name,
      type,
      { type, script },
      {
        customLabel,
        customDescription,
        format,
        popularity,
      }
    );

    return [field];
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
    this.removeRuntimeFieldInteral(name);
  }

  /**
   * Return the "runtime_mappings" section of the ES search query.
   */
  getRuntimeMappings(): estypes.MappingRuntimeFields {
    const records = Object.keys(this.runtimeFieldMap).reduce<Record<string, RuntimeFieldSpec>>(
      (acc, fieldName) => {
        // do not include fields that are mapped
        const field = this.fields.getByName(fieldName);
        if (!field?.isMapped) {
          acc[fieldName] = this.runtimeFieldMap[fieldName];
        }

        return acc;
      },
      {}
    );
    return records as estypes.MappingRuntimeFields;
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

    this.setFieldCustomLabelInternal(fieldName, customLabel);
  }

  /**
   * Set field custom description
   * @param fieldName name of field to set custom label on
   * @param customDescription custom description value. If undefined, custom description is removed
   */

  public setFieldCustomDescription(
    fieldName: string,
    customDescription: string | undefined | null
  ) {
    const fieldObject = this.fields.getByName(fieldName);
    const newCustomDescription: string | undefined =
      customDescription === null ? undefined : customDescription;

    if (fieldObject) {
      fieldObject.customDescription = newCustomDescription;
    }

    this.setFieldCustomDescriptionInternal(fieldName, customDescription);
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
    this.setFieldCountInternal(fieldName, newCount);
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
        customDescription: subField.customDescription,
        format: subField.format,
        popularity: subField.popularity,
      })
    );

    this.addRuntimeFieldInteral(name, runtimeField);
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
    this.setFieldCustomLabel(fieldName, config.customLabel);
    this.setFieldCustomDescription(fieldName, config.customDescription);

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

  upsertScriptedField = (field: FieldSpec) => {
    this.upsertScriptedFieldInternal(field);
    const fieldExists = !!this.fields.getByName(field.name);

    if (fieldExists) {
      this.fields.update(field);
    } else {
      this.fields.add(field);
    }
  };
}
