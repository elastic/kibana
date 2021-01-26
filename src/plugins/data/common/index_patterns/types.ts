/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ToastInputFields, ErrorToastOptions } from 'src/core/public/notifications';
// eslint-disable-next-line
import type { SavedObject } from 'src/core/server';
import { IFieldType } from './fields';
import { SerializedFieldFormat } from '../../../expressions/common';
import { KBN_FIELD_TYPES, IndexPatternField, FieldFormat } from '..';

export type FieldFormatMap = Record<string, SerializedFieldFormat>;
const RUNTIME_FIELD_TYPES = ['keyword', 'long', 'double', 'date', 'ip', 'boolean'] as const;
type RuntimeType = typeof RUNTIME_FIELD_TYPES[number];
export interface RuntimeField {
  type: RuntimeType;
  script: {
    source: string;
  };
}

/**
 * IIndexPattern allows for an IndexPattern OR an index pattern saved object
 * too ambiguous, should be avoided
 */
export interface IIndexPattern {
  fieldFormatMap?: Record<string, SerializedFieldFormat<unknown> | undefined>;
  fields: IFieldType[];
  /**
   * Look up a formatter for a given field
   */
  getFormatterForField?: (
    field: IndexPatternField | IndexPatternField['spec'] | IFieldType
  ) => FieldFormat;
  getTimeField?(): IFieldType | undefined;
  id?: string;
  patternList: string[];
  patternListActive: string[];
  timeFieldName?: string;
  title: string;
  /**
   * Type is used for identifying rollup indices, otherwise left undefined
   */
  type?: string;
}

/**
 * Interface for an index pattern saved object
 */
export interface IndexPatternAttributes {
  /**
   * prevents errors when index pattern exists before indices
   */
  allowNoIndex?: boolean;
  fieldAttrs?: string;
  fieldFormatMap?: string;
  fields: string;
  intervalName?: string;
  patternList: string[];
  runtimeFieldMap?: string;
  sourceFilters?: string;
  timeFieldName?: string;
  title: string;
  type: string;
  typeMeta: string;
}

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
  allowNoIndex?: boolean;
  formatFields?: boolean;
  lookBack?: boolean;
  metaFields?: string[];
  patternList: string[];
  rollupIndex?: string;
  type?: string;
}

export interface GetPatternListFieldsOptions extends GetFieldsOptions {
  formatFields?: boolean;
  patternList: string[];
}

export interface GetFieldsOptionsTimePattern {
  pattern: string;
  metaFields: string[];
  lookBack: number;
  interval: string;
}

export interface ValidatePatternListActive {
  allowNoIndex?: boolean;
  patternList: string[];
}

export interface IIndexPatternsApiClient {
  validatePatternListActive: (options: ValidatePatternListActive) => Promise<any>;
  getFieldsForTimePattern: (options: GetFieldsOptionsTimePattern) => Promise<any>;
  getFieldsForWildcard: (options: GetFieldsOptions) => Promise<any>;
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

export interface IFieldSubType {
  multi?: { parent: string };
  nested?: { path: string };
}

export interface TypeMeta {
  aggs?: Record<string, AggregationRestrictions>;
  [key: string]: any;
}

export type FieldSpecConflictDescriptions = Record<string, string[]>;

// This should become FieldSpec once types are cleaned up
export interface FieldSpecExportFmt {
  count?: number;
  script?: string;
  lang?: string;
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
 * Serialized version of IndexPatternField
 */
export interface FieldSpec {
  /**
   * Popularity count is used by discover
   */
  count?: number;
  /**
   * Scripted field painless script
   */
  script?: string;
  /**
   * Scripted field langauge
   * Painless is the only valid scripted field language
   */
  lang?: string;
  conflictDescriptions?: Record<string, string[]>;
  format?: SerializedFieldFormat;
  name: string;
  type: string;
  esTypes?: string[];
  scripted?: boolean;
  searchable: boolean;
  aggregatable: boolean;
  readFromDocValues?: boolean;
  subType?: IFieldSubType;
  indexed?: boolean;
  customLabel?: string;
  runtimeField?: RuntimeField;
  // not persisted
  shortDotsEnable?: boolean;
  isMapped?: boolean;
}

export type IndexPatternFieldMap = Record<string, FieldSpec>;

/**
 * Static index pattern format
 * Serialized data object, representing index pattern attributes and state
 */
export interface IndexPatternSpec {
  allowNoIndex?: boolean;
  fieldAttrs?: FieldAttrs;
  fieldFormats?: Record<string, SerializedFieldFormat>;
  fields?: IndexPatternFieldMap;
  /**
   * saved object id
   */
  id: string;
  /**
   * @deprecated
   * Deprecated. Was used by time range based index patterns
   */
  intervalName?: string;
  patternList: string[];
  patternListActive: string[];
  runtimeFieldMap?: Record<string, RuntimeField>;
  sourceFilters?: SourceFilter[];
  timeFieldName?: string;
  title: string;
  type?: string;
  typeMeta?: TypeMeta;
  /**
   * saved object version string
   */
  version?: string;
}
export type IndexPatternSpecPreValidation = Omit<IndexPatternSpec, 'patternListActive'>;

export interface SourceFilter {
  value: string;
}

export type Maybe<T> = T | null;
interface FieldInfo {
  category: string;
  description?: string;
  example?: string | number;
  format?: string;
  name: string;
  type?: string;
}

export interface FieldDescriptor {
  /** Whether the field's values can be aggregated */
  aggregatable: boolean;
  /** the elastic type as mapped in the index */
  esTypes: string[];
  /** The name of the field */
  name: string;
  readFromDocValues: boolean;
  /** Whether the field's values can be efficiently searched for */
  searchable: boolean;
  subType?: IFieldSubType;
  /** The type of the field's values as recognized by Kibana */
  type: string;
}

export interface IndexField extends FieldDescriptor {
  /** Where the field belong */
  category: string;
  /** Example of field's value */
  example?: Maybe<string | number>;
  /** whether the field's belong to an alias index */
  indexes: Array<Maybe<string>>;
  /** Description of the field */
  description?: Maybe<string>;
  format?: Maybe<string>;
}

export type BeatFields = Record<string, FieldInfo>;
