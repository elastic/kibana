/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
// import { filter } from 'lodash';
import { reject, each, cloneDeep } from 'lodash';
import { AbstractDataView } from './abstract_data_views';
// import type { TimeBasedDataView } from './data_view';
import type { DataViewField } from '../fields';

import type {
  // DataViewFieldMap,
  DataViewSpec,
  /*
  FieldConfiguration,
  RuntimeField,
  RuntimeFieldSpec,
  RuntimeType,
  */
  FieldSpec,
  IDataViewsApiClient,
} from '../types';

interface DataViewDeps {
  spec?: DataViewSpec;
  fieldFormats: FieldFormatsStartCommon;
  shortDotsEnable?: boolean;
  metaFields?: string[];
  apiClient: IDataViewsApiClient;
}

interface GetFieldsParams {
  type?: string;
  lookBack?: boolean;
  // metaFields?: string[];
  rollupIndex?: string;
  allowNoIndex?: boolean;
  // indexFilter?: QueryDslQueryContainer;
  includeUnmapped?: boolean;
  fieldName?: string[];
  includeScriptedFields?: boolean;
}

export class DataViewLazy extends AbstractDataView {
  private apiClient: IDataViewsApiClient;

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
  async getFields(getFieldParams: GetFieldsParams) {
    const response = await this.apiClient.getFieldsForWildcard({
      pattern: this.getIndexPattern(),
      rollupIndex: getFieldParams.rollupIndex,
      fields: getFieldParams.fieldName || ['*'],
      // maybe rename this to 'types'
      type: getFieldParams.type, // this might need stricter type
      allowNoIndex: true,
      // indexFilter: getFieldParams.indexFilter,
      // I think this should always be true
      includeUnmapped: true,
    });
    // map spec to class
    // look at refreshFieldsFn

    // add scripted fields if enabled
    return response.fields;
  }

  // get computed fields WITHOUT looking at the field list
  getComputedFields(fields: DataViewField[]) {
    const scriptFields: Record<string, estypes.ScriptField> = {};
    if (!fields.length) {
      return {
        scriptFields,
        docvalueFields: [] as Array<{ field: string; format: string }>,
        runtimeFields: {},
      };
    }

    // Date value returned in "_source" could be in a number of formats
    // Use a docvalue for each date field to ensure standardized formats when working with date fields
    // dataView.flattenHit will override "_source" values when the same field is also defined in "fields"

    // gets all date fields that are not scripted
    // todo filter fields by type
    const docvalueFields = reject(fields, 'scripted').map((dateField) => {
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
      scriptFields,
      docvalueFields,
      runtimeFields,
    };
  }

  private getRuntimeMappings() {
    // todo
    return {};
  }

  // TODO should specify which fields are needed
  /**
   * Creates static representation of the data view.
   * @param includeFields Whether or not to include the `fields` list as part of this spec. If not included, the list
   * will be fetched from Elasticsearch when instantiating a new Data View with this spec.
   */
  public toSpec(includeFields = true): DataViewSpec {
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

    const spec: DataViewSpec = {
      id: this.id,
      version: this.version,
      title: this.getIndexPattern(),
      timeFieldName: this.timeFieldName,
      sourceFilters: [...(this.sourceFilters || [])],
      fields: {},
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
  toMinimalSpec() {}

  removeScriptedField(fieldName: string) {
    this.deleteScriptedFieldInternal(fieldName);
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

  // todo - return field class
  async getTimeField() {
    const fldArray = this.timeFieldName
      ? await this.getFields({ fieldName: [this.timeFieldName] })
      : [];
    return fldArray.length ? fldArray[0] : undefined;
  }

  async getFieldByName(name: string) {
    const fieldArray = await this.getFields({ fieldName: [name] });
    return fieldArray.length ? fieldArray[0] : undefined;
  }

  // todo RUNTIME FIELD FUNCTIONALITY

  /**
   * Set field custom label
   * @param fieldName name of field to set custom label on
   * @param customLabel custom label value. If undefined, custom label is removed
   */

  public setFieldCustomLabel(fieldName: string, customLabel: string | undefined | null) {
    /*

    // TODO - update existing fields

    const fieldObject = this.fields.getByName(fieldName);
    const newCustomLabel: string | undefined = customLabel === null ? undefined : customLabel;

    if (fieldObject) {
      fieldObject.customLabel = newCustomLabel;
    }
    */

    this.setFieldCustomLabelInternal(fieldName, customLabel);
  }

  /**
   * Set field count
   * @param fieldName name of field to set count on
   * @param count count value. If undefined, count is removed
   */

  public setFieldCount(fieldName: string, count: number | undefined | null) {
    /*

    // TODO - update existing fields

    const fieldObject = this.fields.getByName(fieldName);
    const newCount: number | undefined = count === null ? undefined : count;

    if (fieldObject) {
      if (!newCount) fieldObject.deleteCount();
      else fieldObject.count = newCount;
    }
    */
    // this.setFieldAttrs(fieldName, 'count', newCount);
    this.setFieldAttrs(fieldName, 'count', count!);
  }
}
