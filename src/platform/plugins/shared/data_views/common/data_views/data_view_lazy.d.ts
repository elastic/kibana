/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import { AbstractDataView } from './abstract_data_views';
import type { DataViewField } from '../fields';
import type { DataViewSpec, RuntimeField, FieldSpec, IDataViewsApiClient } from '../types';
interface DataViewDeps {
  spec?: DataViewSpec;
  fieldFormats: FieldFormatsStartCommon;
  shortDotsEnable?: boolean;
  metaFields?: string[];
  apiClient: IDataViewsApiClient;
  scriptedFieldsEnabled: boolean;
}
interface GetFieldsParams {
  indexFilter?: QueryDslQueryContainer;
  unmapped?: boolean;
  fieldName: string[];
  mapped?: boolean;
  scripted?: boolean;
  runtime?: boolean;
  forceRefresh?: boolean;
  metaFields?: boolean;
  fieldTypes?: string[];
}
type DataViewFieldMap = Record<string, DataViewField>;
export declare class DataViewLazy extends AbstractDataView {
  private apiClient;
  private fieldCache;
  /**
   * Returns true if scripted fields are enabled
   */
  protected scriptedFieldsEnabled: boolean;
  constructor(config: DataViewDeps);
  getFields({
    mapped,
    scripted,
    runtime,
    fieldName,
    forceRefresh,
    unmapped,
    indexFilter,
    metaFields,
  }: GetFieldsParams): Promise<{
    getFieldMap: () => DataViewFieldMap;
    getFieldMapSorted: () => Record<string, DataViewField>;
  }>;
  getRuntimeFields: ({ fieldName }: Pick<GetFieldsParams, 'fieldName'>) => DataViewFieldMap;
  /**
   * Add a runtime field - Appended to existing mapped field or a new field is
   * created as appropriate.
   * @param name Field name
   * @param runtimeField Runtime field definition
   */
  addRuntimeField(name: string, runtimeField: RuntimeField): Promise<DataViewField[]>;
  private addCompositeRuntimeField;
  /**
   * Remove a runtime field - removed from mapped field or removed unmapped
   * field as appropriate. Doesn't clear associated field attributes.
   * @param name - Field name to remove
   */
  removeRuntimeField(name: string): void;
  private getFieldsByRuntimeFieldName;
  private updateOrAddRuntimeField;
  private getRuntimeFieldSpecMap;
  getScriptedFields({
    fieldName,
  }: Pick<GetFieldsParams, 'fieldName'>): Record<string, DataViewField>;
  private getMappedFields;
  getScriptedFieldsForQuery(): Record<string, estypes.ScriptField>;
  getComputedFields({ fieldName }: { fieldName: string[] }): Promise<{
    scriptFields: Record<string, estypes.ScriptField>;
    docvalueFields: {
      field: string;
      format: string;
    }[];
    runtimeFields: estypes.MappingRuntimeFields;
  }>;
  getRuntimeMappings(): estypes.MappingRuntimeFields;
  /**
   * Creates static representation of the data view.
   * @param includeFields Whether or not to include the `fields` list as part of this spec. If not included, the list
   * will be fetched from Elasticsearch when instantiating a new Data View with this spec.
   */
  toSpec(params?: { fieldParams?: GetFieldsParams }): Promise<DataViewSpec>;
  /**
   * Creates a minimal static representation of the data view. Fields and popularity scores will be omitted.
   */
  toMinimalSpec(params?: {
    keepFieldAttrs?: Array<'customLabel' | 'customDescription'>;
  }): Omit<DataViewSpec, 'fields'>;
  /**
   * returns true if dataview contains TSDB fields
   */
  isTSDBMode(): Promise<boolean>;
  removeScriptedField(fieldName: string): void;
  upsertScriptedField(field: FieldSpec): void;
  isTimeBased: () => Promise<boolean>;
  isTimeNanosBased(): Promise<boolean>;
  getTimeField: () => Promise<DataViewField> | undefined;
  getFieldByName(name: string, forceRefresh?: boolean): Promise<DataViewField>;
  /**
   * Set field custom label
   * @param fieldName name of field to set custom label on
   * @param customLabel custom label value. If undefined, custom label is removed
   */
  setFieldCustomLabel(fieldName: string, customLabel: string | undefined | null): void;
  setFieldCount(fieldName: string, count: number | undefined | null): void;
  setFieldCustomDescription(fieldName: string, customDescription: string | undefined | null): void;
}
export {};
