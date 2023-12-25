/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
// import { filter } from 'lodash';
import { AbstractDataView } from './abstract_data_views';
// import type { TimeBasedDataView } from './data_view';

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
  getComputedFields() {}

  // should specify which fields are needed
  toSpec() {}

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

  setFieldCustomLabel(fieldName: string, customLabel: string) {}

  setFieldCount(fieldName: string, count: number) {}

  // search to see what this does
  getMappedFieldNames() {}
}
