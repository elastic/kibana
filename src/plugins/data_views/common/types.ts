/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { DataViewFieldBase, IFieldSubType, DataViewBase } from '@kbn/es-query';
import { ToastInputFields, ErrorToastOptions } from '@kbn/core/public/notifications';
// eslint-disable-next-line
import type { SavedObject } from 'src/core/server';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { FieldFormat, SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { IFieldType } from './fields';
import { RUNTIME_FIELD_TYPES } from './constants';
import { DataViewField } from './fields';

export type { QueryDslQueryContainer };

export type FieldFormatMap = Record<string, SerializedFieldFormat>;

/**
 * Runtime field - type of value returned
 */

export type RuntimeType = typeof RUNTIME_FIELD_TYPES[number];

export type RuntimeTypeExceptComposite = Exclude<RuntimeType, 'composite'>;

export interface RuntimeFieldBase {
  type: RuntimeType;
  script?: {
    source: string;
  };
}

/**
 * The RuntimeField that will be sent in the ES Query "runtime_mappings" object
 */
export interface RuntimeFieldSpec extends RuntimeFieldBase {
  fields?: Record<
    string,
    {
      // It is not recursive, we can't create a composite inside a composite.
      type: RuntimeTypeExceptComposite;
    }
  >;
}

export interface FieldConfiguration {
  format?: SerializedFieldFormat | null;
  customLabel?: string;
  popularity?: number;
}

/**
 * This is the RuntimeField interface enhanced with Data view field
 * configuration: field format definition, customLabel or popularity.
 *
 * @see {@link RuntimeField}
 */
export interface RuntimeField extends RuntimeFieldBase, FieldConfiguration {
  fields?: Record<string, RuntimeFieldSubField>;
}

export interface RuntimeFieldSubField extends FieldConfiguration {
  type: RuntimeTypeExceptComposite;
}

/**
 * @deprecated
 * IIndexPattern allows for an IndexPattern OR an index pattern saved object
 * Use DataView or DataViewSpec instead
 */
export interface IIndexPattern extends DataViewBase {
  title: string;
  fields: IFieldType[];
  /**
   * Type is used for identifying rollup indices, otherwise left undefined
   */
  type?: string;
  timeFieldName?: string;
  getTimeField?(): IFieldType | undefined;
  fieldFormatMap?: Record<string, SerializedFieldFormat<unknown> | undefined>;
  /**
   * Look up a formatter for a given field
   */
  getFormatterForField?: (field: DataViewField | DataViewField['spec'] | IFieldType) => FieldFormat;
}

/**
 * Interface for the data view saved object
 */
export interface DataViewAttributes {
  /**
   * fields as a serialized array of field specs
   */
  fields: string;
  /**
   * data view title
   */
  title: string;
  /**
   * data view type. default or rollup
   */
  type?: string;
  /**
   * type metadata information, serialized. Only used by rollup data views
   */
  typeMeta?: string;
  /**
   * time field name
   */
  timeFieldName?: string;
  /**
   * serialized array of filters. used by discover to hide fields
   */
  sourceFilters?: string;
  /**
   * serialized map of field formats by field name
   */
  fieldFormatMap?: string;
  /**
   * serialized map of field attributes, currently field count and name
   */
  fieldAttrs?: string;
  /**
   * serialized map of runtime field definitions, by field name
   */
  runtimeFieldMap?: string;
  /**
   * prevents errors when index pattern exists before indices
   */
  allowNoIndex?: boolean;
}

/**
 * @deprecated Use DataViewAttributes. All index pattern interfaces were renamed.
 */
export type IndexPatternAttributes = DataViewAttributes;

/**
 * @intenal
 * Storage of field attributes. Necessary since the field list isn't saved.
 */
export interface FieldAttrs {
  [key: string]: FieldAttrSet;
}

export interface FieldAttrSet {
  customLabel?: string;
  count?: number;
}

export type OnNotification = (toastInputFields: ToastInputFields, key: string) => void;
export type OnError = (error: Error, toastInputFields: ErrorToastOptions, key: string) => void;

export interface UiSettingsCommon {
  get: <T = any>(key: string) => Promise<T>;
  getAll: () => Promise<Record<string, unknown>>;
  set: (key: string, value: any) => Promise<void>;
  remove: (key: string) => Promise<void>;
}

export interface SavedObjectsClientCommonFindArgs {
  type: string | string[];
  fields?: string[];
  perPage?: number;
  search?: string;
  searchFields?: string[];
}

export interface SavedObjectsClientCommon {
  find: <T = unknown>(options: SavedObjectsClientCommonFindArgs) => Promise<Array<SavedObject<T>>>;
  get: <T = unknown>(type: string, id: string) => Promise<SavedObject<T>>;
  update: (
    type: string,
    id: string,
    attributes: Record<string, any>,
    options: Record<string, any>
  ) => Promise<SavedObject>;
  create: (
    type: string,
    attributes: Record<string, any>,
    options: Record<string, any>
  ) => Promise<SavedObject>;
  delete: (type: string, id: string) => Promise<{}>;
}

export interface GetFieldsOptions {
  pattern: string;
  type?: string;
  lookBack?: boolean;
  metaFields?: string[];
  rollupIndex?: string;
  allowNoIndex?: boolean;
  filter?: QueryDslQueryContainer;
}

export interface GetFieldsOptionsTimePattern {
  pattern: string;
  metaFields: string[];
  lookBack: number;
  interval: string;
}

export interface IDataViewsApiClient {
  getFieldsForTimePattern: (options: GetFieldsOptionsTimePattern) => Promise<any>;
  getFieldsForWildcard: (options: GetFieldsOptions) => Promise<any>;
  hasUserIndexPattern: () => Promise<boolean>;
}

export type { SavedObject };

export type AggregationRestrictions = Record<
  string,
  {
    agg?: string;
    interval?: number;
    fixed_interval?: string;
    calendar_interval?: string;
    delay?: string;
    time_zone?: string;
  }
>;

/**
 * interface for metadata about rollup indices
 */

export interface TypeMeta {
  /**
   * Aggregation restrictions for rollup fields
   */
  aggs?: Record<string, AggregationRestrictions>;
  /**
   * Params for retrieving rollup field data
   */
  params?: {
    /**
     * Rollup index name used for loading field list
     */
    rollup_index: string;
  };
}

export enum DataViewType {
  DEFAULT = 'default',
  ROLLUP = 'rollup',
}

/**
 * @deprecated Use DataViewType. All index pattern interfaces were renamed.
 */
export enum IndexPatternType {
  DEFAULT = DataViewType.DEFAULT,
  ROLLUP = DataViewType.ROLLUP,
}

export type FieldSpecConflictDescriptions = Record<string, string[]>;

// This should become FieldSpec once types are cleaned up
export interface FieldSpecExportFmt {
  count?: number;
  script?: string;
  lang?: estypes.ScriptLanguage;
  conflictDescriptions?: FieldSpecConflictDescriptions;
  name: string;
  type: KBN_FIELD_TYPES;
  esTypes?: string[];
  scripted: boolean;
  searchable: boolean;
  aggregatable: boolean;
  readFromDocValues?: boolean;
  subType?: IFieldSubType;
  format?: SerializedFieldFormat;
  indexed?: boolean;
}

/**
 * @public
 * Serialized version of DataViewField
 */
export interface FieldSpec extends DataViewFieldBase {
  /**
   * Popularity count is used by discover
   */
  count?: number;
  /**
   * description of field type conflicts across indices
   */
  conflictDescriptions?: Record<string, string[]>;
  /**
   * field formatting in serialized format
   */
  format?: SerializedFieldFormat;
  /**
   * elasticsearch field types used by backing indices
   */
  esTypes?: string[];
  /**
   * true if field is searchable
   */
  searchable: boolean;
  /**
   * true if field is aggregatable
   */
  aggregatable: boolean;
  /**
   * true if can be read from doc values
   */
  readFromDocValues?: boolean;
  /**
   * true if field is indexed
   */
  indexed?: boolean;
  /**
   * custom label for field - used for display in kibana
   */
  customLabel?: string;
  /**
   * runtime field definition
   */
  runtimeField?: RuntimeFieldSpec;

  // not persisted

  /**
   * Whether short dots are enabled. based on uiSettings
   */
  shortDotsEnable?: boolean;
  /**
   * Is this field in the mapping? False if a scripted or runtime field defined on the data view
   */
  isMapped?: boolean;
}

export type DataViewFieldMap = Record<string, FieldSpec>;

/**
 * Static data view format
 * Serialized data object, representing data view attributes and state
 */
export interface DataViewSpec {
  /**
   * saved object id
   */
  id?: string;
  /**
   * saved object version string
   */
  version?: string;
  /**
   * data view title
   */
  title?: string;
  /**
   * name of timestamp field
   */
  timeFieldName?: string;
  /**
   * list of filters which discover uses to hide fields
   */
  sourceFilters?: SourceFilter[];
  /**
   * map of fields by name
   */
  fields?: DataViewFieldMap;
  /**
   * metadata about data view, only used by rollup data views
   */
  typeMeta?: TypeMeta;
  /**
   * default or rollup
   */
  type?: string;
  /**
   * map of serialized field formats by field name
   */
  fieldFormats?: Record<string, SerializedFieldFormat>;
  /**
   * map of runtime fields by field name
   */
  runtimeFieldMap?: Record<string, RuntimeFieldSpec>;
  /**
   * map of field attributes by field name, currently customName and count
   */
  fieldAttrs?: FieldAttrs;
  /**
   * determines whether failure to load field list should be reported as error
   */
  allowNoIndex?: boolean;
  /**
   * array of namespace ids
   */
  namespaces?: string[];
}

export interface SourceFilter {
  value: string;
}

export interface HasDataService {
  hasESData: () => Promise<boolean>;
  hasUserDataView: () => Promise<boolean>;
  hasDataView: () => Promise<boolean>;
}
