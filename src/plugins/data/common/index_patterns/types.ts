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
import { IFieldType } from './fields';
import { SerializedFieldFormat } from '../../../expressions/common';
import { KBN_FIELD_TYPES } from '..';

export interface IIndexPattern {
  [key: string]: any;
  fields: IFieldType[];
  title: string;
  id?: string;
  type?: string;
  timeFieldName?: string;
  getTimeField?(): IFieldType | undefined;
  fieldFormatMap?: Record<
    string,
    {
      id: string;
      params: unknown;
    }
  >;
}

/**
 * Use data plugin interface instead
 * @deprecated
 */
export interface IndexPatternAttributes {
  type: string;
  fields: string;
  title: string;
  typeMeta: string;
  timeFieldName?: string;
}

export type OnNotification = (toastInputFields: ToastInputFields) => void;
export type OnError = (error: Error, toastInputFields: ErrorToastOptions) => void;

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
  [key: string]: any;
  format?: SerializedFieldFormat;
}

export interface IndexPatternSpec {
  id?: string;
  version?: string;

  title: string;
  timeFieldName?: string;
  sourceFilters?: SourceFilter[];
  fields?: FieldSpec[];
  typeMeta?: TypeMeta;
}

export interface SourceFilter {
  value: string;
}
