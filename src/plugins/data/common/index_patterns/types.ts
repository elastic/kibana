/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ToastInputFields, ErrorToastOptions } from 'src/core/public/notifications';
// eslint-disable-next-line
import type { SavedObject } from 'src/core/server';
import { IFieldType } from './fields';
import { SerializedFieldFormat } from '../../../expressions/common';
import { KBN_FIELD_TYPES, IndexPatternField, FieldFormat } from '..';

export type FieldFormatMap = Record<string, SerializedFieldFormat>;

export interface IIndexPattern {
  fields: IFieldType[];
  title: string;
  id?: string;
  type?: string;
  timeFieldName?: string;
  intervalName?: string | null;
  getTimeField?(): IFieldType | undefined;
  fieldFormatMap?: Record<string, SerializedFieldFormat<unknown> | undefined>;
  getFormatterForField?: (
    field: IndexPatternField | IndexPatternField['spec'] | IFieldType
  ) => FieldFormat;
}

export interface IndexPatternAttributes {
  type: string;
  fields: string;
  title: string;
  typeMeta: string;
  timeFieldName?: string;
  intervalName?: string;
  sourceFilters?: string;
  fieldFormatMap?: string;
}

export type OnNotification = (toastInputFields: ToastInputFields) => void;
export type OnError = (error: Error, toastInputFields: ErrorToastOptions) => void;

export type OnUnsupportedTimePattern = ({
  id,
  title,
  index,
}: {
  id: string;
  title: string;
  index: string;
}) => void;

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
  update: <T = unknown>(
    type: string,
    id: string,
    attributes: Record<string, any>,
    options: Record<string, any>
  ) => Promise<SavedObject<T>>;
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

export interface FieldSpec {
  count?: number;
  script?: string;
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
}

export type IndexPatternFieldMap = Record<string, FieldSpec>;

export interface IndexPatternSpec {
  id?: string;
  version?: string;
  title?: string;
  intervalName?: string;
  timeFieldName?: string;
  sourceFilters?: SourceFilter[];
  fields?: IndexPatternFieldMap;
  typeMeta?: TypeMeta;
  type?: string;
  fieldFormats?: Record<string, SerializedFieldFormat>;
}

export interface SourceFilter {
  value: string;
}
