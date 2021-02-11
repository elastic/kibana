/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToastInputFields, ErrorToastOptions } from 'src/core/public/notifications';
// eslint-disable-next-line
import type { SavedObject } from 'src/core/server';
import { IFieldType } from './fields';
import { RUNTIME_FIELD_TYPES } from './constants';
import { SerializedFieldFormat } from '../../../expressions/common';
import { KBN_FIELD_TYPES, IndexPatternField, FieldFormat } from '..';

export type FieldFormatMap = Record<string, SerializedFieldFormat>;

export type RuntimeType = typeof RUNTIME_FIELD_TYPES[number];
export interface RuntimeField {
  type: RuntimeType;
  script?: {
    source: string;
  };
}

/**
 * IIndexPattern allows for an IndexPattern OR an index pattern saved object
 * too ambiguous, should be avoided
 */
export interface IIndexPattern {
  fields: IFieldType[];
  title: string;
  id?: string;
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
  getFormatterForField?: (
    field: IndexPatternField | IndexPatternField['spec'] | IFieldType
  ) => FieldFormat;
}

/**
 * Interface for an index pattern saved object
 */
export interface IndexPatternAttributes {
  type: string;
  fields: string;
  title: string;
  typeMeta: string;
  timeFieldName?: string;
  intervalName?: string;
  sourceFilters?: string;
  fieldFormatMap?: string;
  fieldAttrs?: string;
  runtimeFieldMap?: string;
  /**
   * prevents errors when index pattern exists before indices
   */
  allowNoIndex?: boolean;
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

export interface IIndexPatternsApiClient {
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
  fields?: IndexPatternFieldMap;
  typeMeta?: TypeMeta;
  type?: string;
  fieldFormats?: Record<string, SerializedFieldFormat>;
  runtimeFieldMap?: Record<string, RuntimeField>;
  fieldAttrs?: FieldAttrs;
  allowNoIndex?: boolean;
}

export interface SourceFilter {
  value: string;
}
