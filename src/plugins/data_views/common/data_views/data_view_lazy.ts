/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  FieldFormatsStartCommon,
  // SerializedFieldFormat,
} from '@kbn/field-formats-plugin/common';
import { castEsToKbnFieldTypeName } from '@kbn/field-types';
import { each, cloneDeep, pickBy, mapValues, omit } from 'lodash';
import { CharacterNotAllowedInField } from '@kbn/kibana-utils-plugin/common';
import { AbstractDataView } from './abstract_data_views';
// import type { TimeBasedDataView } from './data_view';
import { DataViewField } from '../fields';
import { DataViewLazyFieldCache, createDataViewFieldCache } from './data_view_lazy_field_cache';
import { fieldsMatchFieldsRequested } from './data_view_lazy_util';

import type {
  DataViewFieldMap,
  DataViewSpec,
  FieldConfiguration,
  RuntimeField,
  RuntimeFieldSpec,
  RuntimeType,
  FieldSpec,
  IDataViewsApiClient,
  // FieldAttrs,
} from '../types';
import { removeFieldAttrs } from './utils';

interface DataViewDeps {
  spec?: DataViewSpec;
  fieldFormats: FieldFormatsStartCommon;
  shortDotsEnable?: boolean;
  metaFields?: string[];
  apiClient: IDataViewsApiClient;
}

interface GetFieldsParams {
  type?: string[];
  // lookBack?: boolean;
  // metaFields?: string[];
  // rollupIndex?: string;
  // allowNoIndex?: boolean;
  // indexFilter?: QueryDslQueryContainer;
  // todo
  // includeUnmapped?: boolean;
  fieldName?: string[]; // supports wildcard
  mapped?: boolean;
  scripted?: boolean;
  runtime?: boolean;
  forceRefresh?: boolean;
}

export class DataViewLazy extends AbstractDataView {
  private apiClient: IDataViewsApiClient;
  private fieldCache: DataViewLazyFieldCache = createDataViewFieldCache();

  constructor(config: DataViewDeps) {
    super(config);
    this.apiClient = config.apiClient;
  }

  /*
  pattern: string;
  type?: string;
   // lookBack?: boolean;
  metaFields?: string[];
  rollupIndex?: string;
  allowNoIndex?: boolean;
  indexFilter?: QueryDslQueryContainer;
  includeUnmapped?: boolean;
  fields?: string[];
  */
  async getFields(
    {
      mapped = true,
      scripted = true,
      runtime = true,
      type,
      fieldName = ['*'],
      forceRefresh = false,
    }: GetFieldsParams // todo implement
  ) {
    const dataViewFields: DataViewField[] = [];
    if (mapped !== false) {
      const mappedFields = await this.getMappedFields({ type, fieldName, forceRefresh });
      dataViewFields.push(...mappedFields);
    }
    // todo double check which field type is given preference
    if (scripted !== false) {
      const scriptedFields = this.getScriptedFieldsInternal({ fieldName });
      dataViewFields.push(...scriptedFields);
    }

    // todo will need to check for mapped field which would override runtime
    if (runtime !== false) {
      const runtimeFields = Object.values(this.getRuntimeFieldSpecMap({ fieldName })).map(
        // todo this set/get thing could be neater. Also happens for mapped. check scripted
        (field) => {
          const fld =
            this.fieldCache.get(field.name) ||
            this.fieldCache.set(
              field.name,
              new DataViewField({ ...field, shortDotsEnable: this.shortDotsEnable })
            );

          return fld;
        }
      );

      dataViewFields.push(...runtimeFields);
    }

    // might be better to return a map
    return dataViewFields;
  }

  /**
   * Add a runtime field - Appended to existing mapped field or a new field is
   * created as appropriate.
   * @param name Field name
   * @param runtimeField Runtime field definition
   */
  async addRuntimeField(name: string, runtimeField: RuntimeField): Promise<DataViewField[]> {
    if (name.includes('*')) {
      throw new CharacterNotAllowedInField('*', name);
    }

    const { type, script, customLabel, format, popularity } = runtimeField;

    if (type === 'composite') {
      return this.addCompositeRuntimeField(name, runtimeField);
    }

    this.addRuntimeFieldInteral(name, runtimeField);
    const field = await this.updateOrAddRuntimeField(
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

  private async addCompositeRuntimeField(
    name: string,
    runtimeField: RuntimeField
  ): Promise<DataViewField[]> {
    const { fields } = runtimeField;

    // Make sure subFields are provided
    if (fields === undefined || Object.keys(fields).length === 0) {
      throw new Error(`Can't add composite runtime field [name = ${name}] without subfields.`);
    }

    // Make sure no field with the same name already exist
    /* todo verify that I want to get rid of this
    if (async this.getFieldByName(name) !== undefined) {
      throw new Error(
        `Can't create composite runtime field ["${name}"] as there is already a field with this name`
      );
    }
    */

    // We first remove the runtime composite field with the same name which will remove all of its subFields.
    // This guarantees that we don't leave behind orphan data view fields
    this.removeRuntimeField(name);

    const runtimeFieldSpec = removeFieldAttrs(runtimeField);

    // We don't add composite runtime fields to the field list as
    // they are not fields but **holder** of fields.
    // What we do add to the field list are all their subFields.
    const dataViewFields = await Promise.all(
      Object.entries(fields).map(
        async ([subFieldName, subField]) =>
          // Every child field gets the complete runtime field script for consumption by searchSource
          await this.updateOrAddRuntimeField(
            `${name}.${subFieldName}`,
            subField.type,
            runtimeFieldSpec,
            {
              customLabel: subField.customLabel,
              format: subField.format,
              popularity: subField.popularity,
            }
          )
      )
    );

    this.addRuntimeFieldInteral(name, runtimeField);
    return dataViewFields;
  }

  /**
   * Remove a runtime field - removed from mapped field or removed unmapped
   * field as appropriate. Doesn't clear associated field attributes.
   * @param name - Field name to remove
   */
  removeRuntimeField(name: string) {
    // note will need to remove from existing fields later

    // todo try without async call
    // const existingField = await this.getFieldByName(name);
    const existingField = this.fieldCache.get(name);

    if (existingField && existingField.isMapped) {
      // mapped field, remove runtimeField def
      existingField.runtimeField = undefined;
    } else {
      Object.values(this.getFieldsByRuntimeFieldName(name) || {}).forEach((field) => {
        this.fieldCache.clear(field.name);
      });
    }

    this.removeRuntimeFieldInteral(name);
  }

  private getFieldsByRuntimeFieldName(name: string): Record<string, DataViewField> | undefined {
    const runtimeField = this.getRuntimeField(name);
    if (!runtimeField) {
      return;
    }

    if (runtimeField.type === 'composite') {
      return Object.entries(runtimeField.fields!).reduce<Record<string, DataViewField>>(
        (acc, [subFieldName, subField]) => {
          const fieldFullName = `${name}.${subFieldName}`;
          const dataViewField = this.fieldCache.get(fieldFullName);

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

    const primitveRuntimeField = this.fieldCache.get(name);

    return primitveRuntimeField && { [name]: primitveRuntimeField };
  }

  private async updateOrAddRuntimeField(
    fieldName: string,
    fieldType: RuntimeType,
    runtimeFieldSpec: RuntimeFieldSpec,
    config: FieldConfiguration
  ): Promise<DataViewField> {
    if (fieldType === 'composite') {
      throw new Error(
        `Trying to add composite field as primmitive field, this shouldn't happen! [name = ${fieldName}]`
      );
    }

    // Create the field if it does not exist or update an existing one
    let createdField: DataViewField | undefined;
    const existingField = await this.getFieldByName(fieldName);

    // if (existingField && !existingField.isMapped) {
    // todo
    if (existingField) {
      existingField.runtimeField = runtimeFieldSpec;
    } else {
      // todo is there a fn that does this?
      createdField = this.fieldCache.set(
        fieldName,
        new DataViewField({
          name: fieldName,
          runtimeField: runtimeFieldSpec,
          type: castEsToKbnFieldTypeName(fieldType),
          esTypes: [fieldType],
          aggregatable: true,
          searchable: true,
          count: config.popularity ?? 0,
          readFromDocValues: false,
          shortDotsEnable: this.shortDotsEnable,
        })
      );
    }

    this.setFieldCustomLabel(fieldName, config.customLabel);

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

  private getRuntimeFieldSpecMap = ({ fieldName = ['*'] }: Pick<GetFieldsParams, 'fieldName'>) => {
    const spec: DataViewFieldMap = {};

    const addRuntimeFieldToSpecFields = (
      name: string,
      fieldType: RuntimeType,
      runtimeField: RuntimeFieldSpec,
      parentName?: string
    ) => {
      spec[name] = {
        name,
        type: castEsToKbnFieldTypeName(fieldType),
        esTypes: [fieldType],
        runtimeField,
        aggregatable: true,
        searchable: true,
        readFromDocValues: false,
        customLabel: this.fieldAttrs?.[name]?.customLabel,
        count: this.fieldAttrs?.[name]?.count,
      };

      if (parentName) {
        spec[name].parentName = parentName;
      }
    };

    // CREATE RUNTIME FIELDS
    for (const [name, runtimeField] of Object.entries(this.runtimeFieldMap || {})) {
      if (fieldsMatchFieldsRequested(name, fieldName)) {
        // For composite runtime field we add the subFields, **not** the composite
        if (runtimeField.type === 'composite') {
          Object.entries(runtimeField.fields!).forEach(([subFieldName, subField]) => {
            addRuntimeFieldToSpecFields(
              `${name}.${subFieldName}`,
              subField.type,
              runtimeField,
              name
            );
          });
        } else {
          addRuntimeFieldToSpecFields(name, runtimeField.type, runtimeField);
        }
      }
    }

    return spec;
  };

  // does this need to be named internal?
  private getScriptedFieldsInternal({
    fieldName = ['*'],
  }: Pick<GetFieldsParams, 'fieldName'>): DataViewField[] {
    const dataViewFields: DataViewField[] = [];

    this.scriptedFields.forEach((field) => {
      if (!fieldsMatchFieldsRequested(field.name, fieldName)) {
        return;
      }
      dataViewFields.push(
        this.fieldCache.get(field.name) ||
          this.fieldCache.set(field.name, new DataViewField(field as FieldSpec)) // todo try to remove 'as FieldSpec'
      );
    });
    return dataViewFields;
  }

  private async getMappedFields({
    fieldName,
    type,
    forceRefresh = false,
  }: Omit<GetFieldsParams, 'mapped' | 'scripted' | 'runtime'>) {
    // map spec to class
    // look at refreshFieldsFn
    const response = await this.apiClient.getFieldsForWildcard({
      pattern: this.getIndexPattern(),
      // rollupIndex: getFieldParams.rollupIndex,
      fields: fieldName || ['*'],
      // maybe rename this to 'types'
      type: type?.join(','), // this might need stricter type
      // allowNoIndex: true,
      // indexFilter: getFieldParams.indexFilter,
      // I think this should always be true
      // includeUnmapped: true,
      forceRefresh,
    });

    const dataViewFields: DataViewField[] = [];
    response.fields.forEach((field) => {
      // keep existing field object, make sure content is fresh
      const fld = this.fieldCache.get(field.name);
      if (fld) {
        // update a bunch of things
        // I wonder if there's a more clever way to do this
        fld.spec.aggregatable = field.aggregatable;
        fld.spec.conflictDescriptions = field.conflictDescriptions;
        fld.spec.esTypes = field.esTypes;
        fld.spec.readFromDocValues = field.readFromDocValues;
        fld.spec.searchable = field.searchable;
        fld.spec.aggregatable = field.aggregatable;
        fld.spec.shortDotsEnable = field.shortDotsEnable;
        fld.spec.subType = field.subType;
        fld.spec.timeSeriesDimension = field.timeSeriesDimension;
        fld.spec.timeSeriesMetric = field.timeSeriesMetric;
        fld.spec.type = field.type;
        fld.spec.isMapped = true;
      }
      dataViewFields.push(
        fld ||
          this.fieldCache.set(
            field.name,
            new DataViewField({ ...field, shortDotsEnable: this.shortDotsEnable })
          )
      );
    });

    return dataViewFields;
  }

  // I'm not sure if this is useful but I like that it uses the cache
  getFieldInstance = async (fieldName: string): Promise<DataViewField> => {
    // todo review
    const fld = this.fieldCache.get(fieldName);
    if (fld) return fld;
    const fields = await this.getFields({ fieldName: [fieldName] });
    // todo more specific error OR maybe returning undefined is ok
    if (!fields.length) throw new Error(`Field ${fieldName} not found`);
    return this.fieldCache.set(
      fieldName,
      new DataViewField({ ...fields[0].spec, shortDotsEnable: this.shortDotsEnable })
    );
  };

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

  // get computed fields WITHOUT looking at the field list
  // getComputedFields(fields: DataViewField[]) {
  // perhaps this should only work with fields already loaded
  async getComputedFields({ fieldNames = ['*'] }: { fieldNames: string[] }) {
    const scriptFields: Record<string, estypes.ScriptField> = {};

    const docvalueFields = (
      await this.getFields({
        fieldName: fieldNames,
        type: ['date', 'date_nanos'],
        scripted: false,
        runtime: false,
      })
    ).map((dateField) => {
      return {
        field: dateField.name,
        format:
          dateField.esTypes && dateField.esTypes.indexOf('date_nanos') !== -1
            ? 'strict_date_time'
            : 'date_time',
      };
    });

    each(this.getScriptedFieldsInternal({ fieldName: fieldNames }), function (field) {
      scriptFields[field.name] = {
        script: {
          source: field.script as string,
          lang: field.lang,
        },
      };
    });

    return {
      scriptFields,
      docvalueFields,
      runtimeFields: this.getRuntimeMappings(),
    };
  }

  getRuntimeMappings(): estypes.MappingRuntimeFields {
    const records = this.runtimeFieldMap;
    return records as estypes.MappingRuntimeFields; // todo - why set the type?
  }

  // TODO should specify which fields are needed
  /**
   * Creates static representation of the data view.
   * @param includeFields Whether or not to include the `fields` list as part of this spec. If not included, the list
   * will be fetched from Elasticsearch when instantiating a new Data View with this spec.
   */
  public async toSpec(includeFields = true): Promise<DataViewSpec> {
    // if fields aren't included, don't include count
    const fieldAttrs = cloneDeep(this.fieldAttrs);
    if (!includeFields) {
      Object.keys(fieldAttrs).forEach((key) => {
        delete fieldAttrs[key].count;
        if (Object.keys(fieldAttrs[key]).length === 0) {
          delete fieldAttrs[key];
        }
      });
    }

    const getFieldsAsMap = async () => {
      const fields: DataViewFieldMap = {};
      const fldArray = await this.getFields({ fieldName: ['*'] });
      fldArray.forEach((field) => {
        fields[field.name] = field.toSpec({ getFormatterForField: this.getFormatterForField });
      });
      return fields;
    };

    const fields = includeFields ? await getFieldsAsMap() : undefined;

    const spec: DataViewSpec = {
      id: this.id,
      version: this.version,
      title: this.getIndexPattern(),
      timeFieldName: this.timeFieldName,
      sourceFilters: [...(this.sourceFilters || [])],
      fields,
      typeMeta: this.typeMeta,
      type: this.type,
      fieldFormats: { ...this.fieldFormatMap },
      runtimeFieldMap: cloneDeep(this.runtimeFieldMap),
      fieldAttrs,
      allowNoIndex: this.allowNoIndex,
      name: this.name,
      allowHidden: this.getAllowHidden(),
    };

    // Filter undefined values from the spec
    return Object.fromEntries(Object.entries(spec).filter(([, v]) => typeof v !== 'undefined'));
  }

  // should specify which fields are needed
  /**
   * Creates a minimal static representation of the data view. Fields and popularity scores will be omitted.
   */
  // TODO make synchronous
  public async toMinimalSpec(): Promise<Omit<DataViewSpec, 'fields'>> {
    // removes `fields`
    const dataViewSpec = await this.toSpec(false);

    if (dataViewSpec.fieldAttrs) {
      // removes `count` props (popularity scores) from `fieldAttrs`
      dataViewSpec.fieldAttrs = pickBy(
        mapValues(dataViewSpec.fieldAttrs, (fieldAttrs) => omit(fieldAttrs, 'count')),
        (trimmedFieldAttrs) => Object.keys(trimmedFieldAttrs).length > 0
      );

      if (Object.keys(dataViewSpec.fieldAttrs).length === 0) {
        dataViewSpec.fieldAttrs = undefined;
      }
    }

    return dataViewSpec;
  }

  /**
   * returns true if dataview contains TSDB fields
   */
  async isTSDBMode() {
    // todo this could be more efficient
    return await this.getFields({ fieldName: ['*'] }).then((fields) =>
      fields.some((field) => field.timeSeriesDimension || field.timeSeriesMetric)
    );
  }

  removeScriptedField(fieldName: string) {
    this.deleteScriptedFieldInternal(fieldName);
    this.fieldCache.clear(fieldName);
    // todo also remove from any lists
  }

  // not implementing, use getFields instead
  // getNonScriptedFields() {
  // }

  // todo make sure this returns field instances
  getScriptedFields() {
    // return [...this.fields.getAll().filter((field) => field.scripted)];
    return this.scriptedFields;
  }

  upsertScriptedField(field: FieldSpec) {
    this.scriptedFields.push(field);
  }

  async isTimeBased() {
    return !!(await this.getTimeField());
  }

  async isTimeNanosBased(): Promise<boolean> {
    const field = await this.getTimeField();
    return field ? field.type === 'date_nanos' : false;
  }

  async getTimeField() {
    const fldArray = this.timeFieldName
      ? await this.getFields({ fieldName: [this.timeFieldName] })
      : [];
    return fldArray.length ? fldArray[0] : undefined;
  }

  async getFieldByName(name: string, forceRefresh = false) {
    const fieldArray = await this.getFields({ fieldName: [name], forceRefresh });
    return fieldArray.length ? fieldArray[0] : undefined;
  }

  /**
   * Set field custom label
   * @param fieldName name of field to set custom label on
   * @param customLabel custom label value. If undefined, custom label is removed
   */

  public setFieldCustomLabel(fieldName: string, customLabel: string | undefined | null) {
    // todo this could be cleaned up
    const newCustomLabel: string | undefined = customLabel === null ? undefined : customLabel;
    this.setFieldCustomLabelInternal(fieldName, customLabel);
    const fieldObject = this.fieldCache.get(fieldName);
    if (fieldObject) {
      fieldObject.customLabel = newCustomLabel;
    }
  }

  public setFieldCount(fieldName: string, count: number | undefined | null) {
    // todo this could be cleaned up
    const newCount: number | undefined = count === null ? undefined : count;
    this.setFieldCountInternal(fieldName, count);
    const fieldObject = this.fieldCache.get(fieldName);
    if (fieldObject) {
      if (!newCount) fieldObject.deleteCount();
      else fieldObject.count = newCount;
    }
  }
}
