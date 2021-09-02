/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { estypes } from '@elastic/elasticsearch';
import type { DataViewFieldBase, IFieldSubType, DataViewBase } from '@kbn/es-query';
import { ToastInputFields, ErrorToastOptions } from 'src/core/public/notifications';
// eslint-disable-next-line
import type { SavedObject } from 'src/core/server';
import { IFieldType } from './fields';
import { RUNTIME_FIELD_TYPES } from './constants';
import { SerializedFieldFormat } from '../../../expressions/common';
import { KBN_FIELD_TYPES, DataViewField } from '..';
import { FieldFormat } from '../../../field_formats/common';

export type FieldFormatMap = Record<string, SerializedFieldFormat>;

export type RuntimeType = typeof RUNTIME_FIELD_TYPES[number];

/**
 * The RuntimeField that will be sent in the ES Query "runtime_mappings" object
 */
export interface ESRuntimeField {
  type: RuntimeType;
  script?: {
    source: string;
  };
  fields?: Record<
    string,
    {
      // It is not recursive, we can't create a composite inside a composite.
      type: Omit<RuntimeType, 'composite'>;
    }
  >;
}

/**
 * The RuntimeField which is saved in the Data View saved object. We extend it to
 * keep a reference to a possible parent composite object.
 */
export interface RuntimeField extends ESRuntimeField {
  parentComposite?: string;
}

/**
 * This is the RuntimeField interface enhanced with Data view field
 * configuration: field format definition, customLabel or popularity.
 *
 * @see {@link RuntimeField}
 */
export interface EnhancedRuntimeField extends RuntimeField {
  format?: SerializedFieldFormat;
  customLabel?: string;
  popularity?: number;
}

/**
 * When we add a runtime field of "composite" type we are actually adding a _holder_
 * object with runtime fields inside of it.
 * The RuntimeComposite interface is this holder of fields.
 * It has a name, a script and an array references to the runtime fields it holds.
 */
export interface RuntimeComposite {
  name: string;
  script: {
    source: string;
  };
  subFields: string[];
}

/**
 * This is the same as the RuntimeComposite interface but instead of
 * returning an array of references to the subFields we return a **map** of subfields
 * with their possible format, custom label and popularity.
 *
 * @see {@link RuntimeComposite}
 */
export type RuntimeCompositeWithSubFields = Omit<RuntimeComposite, 'subFields'> & {
  subFields: Record<string, EnhancedRuntimeField>;
};

/**
 * @deprecated
 * IIndexPattern allows for an IndexPattern OR an index pattern saved object
 * Use IndexPattern or IndexPatternSpec instead
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
 * Interface for an index pattern saved object
 */
export interface DataViewAttributes {
  fields: string;
  title: string;
  type?: string;
  typeMeta?: string;
  timeFieldName?: string;
  intervalName?: string;
  sourceFilters?: string;
  fieldFormatMap?: string;
  fieldAttrs?: string;
  runtimeFieldMap?: string;
  runtimeCompositeMap?: string;
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

export type OnNotification = (toastInputFields: ToastInputFields) => void;
export type OnError = (error: Error, toastInputFields: ErrorToastOptions) => void;

export interface UiSettingsCommon {
  get: (key: string) => Promise<any>;
  getAll: () => Promise<Record<string, any>>;
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

/**
 * @deprecated Use IDataViewsApiClient. All index pattern interfaces were renamed.
 */
export type IIndexPatternsApiClient = IDataViewsApiClient;

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

export interface TypeMeta {
  aggs?: Record<string, AggregationRestrictions>;
  params?: {
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
 * Serialized version of IndexPatternField
 */
export interface FieldSpec extends DataViewFieldBase {
  /**
   * Popularity count is used by discover
   */
  count?: number;
  conflictDescriptions?: Record<string, string[]>;
  format?: SerializedFieldFormat;
  esTypes?: string[];
  searchable: boolean;
  aggregatable: boolean;
  readFromDocValues?: boolean;
  indexed?: boolean;
  customLabel?: string;
  runtimeField?: RuntimeField;
  // not persisted
  shortDotsEnable?: boolean;
  isMapped?: boolean;
  parent?: string;
}

export type DataViewFieldMap = Record<string, FieldSpec>;

/**
 * @deprecated Use DataViewFieldMap. All index pattern interfaces were renamed.
 */
export type IndexPatternFieldMap = DataViewFieldMap;

/**
 * Static index pattern format
 * Serialized data object, representing index pattern attributes and state
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
  title?: string;
  /**
   * @deprecated
   * Deprecated. Was used by time range based index patterns
   */
  intervalName?: string;
  timeFieldName?: string;
  sourceFilters?: SourceFilter[];
  fields?: DataViewFieldMap;
  typeMeta?: TypeMeta;
  type?: string;
  fieldFormats?: Record<string, SerializedFieldFormat>;
  runtimeFieldMap?: Record<string, RuntimeField>;
  runtimeCompositeMap?: Record<string, RuntimeComposite>;
  fieldAttrs?: FieldAttrs;
  allowNoIndex?: boolean;
}

/**
 * @deprecated Use DataViewSpec. All index pattern interfaces were renamed.
 */
export type IndexPatternSpec = DataViewSpec;

export interface SourceFilter {
  value: string;
}
