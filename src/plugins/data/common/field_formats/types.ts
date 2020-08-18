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

import { GetConfigFn } from '../types';
import { FieldFormat } from './field_format';
import { FieldFormatsRegistry } from './field_formats_registry';

/** @public **/
export type FieldFormatsContentType = 'html' | 'text';

/** @internal **/
export interface HtmlContextTypeOptions {
  field?: any;
  hit?: Record<string, any>;
}

/** @internal **/
export type HtmlContextTypeConvert = (value: any, options?: HtmlContextTypeOptions) => string;

/** @internal **/
export type TextContextTypeOptions = Record<string, any>;

/** @internal **/
export type TextContextTypeConvert = (value: any, options?: TextContextTypeOptions) => string;

/** @internal **/
export type FieldFormatConvertFunction = HtmlContextTypeConvert | TextContextTypeConvert;

/** @internal **/
export interface FieldFormatConvert {
  text: TextContextTypeConvert;
  html: HtmlContextTypeConvert;
}

/** @public **/
export enum FIELD_FORMAT_IDS {
  _SOURCE = '_source',
  BOOLEAN = 'boolean',
  BYTES = 'bytes',
  COLOR = 'color',
  CUSTOM = 'custom',
  DATE = 'date',
  DATE_NANOS = 'date_nanos',
  DURATION = 'duration',
  IP = 'ip',
  NUMBER = 'number',
  PERCENT = 'percent',
  RELATIVE_DATE = 'relative_date',
  STATIC_LOOKUP = 'static_lookup',
  STRING = 'string',
  TRUNCATE = 'truncate',
  URL = 'url',
}

export interface FieldFormatConfig {
  id: FieldFormatId;
  params: Record<string, any>;
  es?: boolean;
}

export type FieldFormatsGetConfigFn = GetConfigFn;

export type IFieldFormat = PublicMethodsOf<FieldFormat>;

/**
 * @string id type is needed for creating custom converters.
 */
export type FieldFormatId = FIELD_FORMAT_IDS | string;

/** @internal **/
export type FieldFormatInstanceType = (new (
  params?: any,
  getConfig?: FieldFormatsGetConfigFn
) => FieldFormat) & {
  // Static properties:
  id: FieldFormatId;
  title: string;
  fieldType: string | string[];
};

export interface IFieldFormatMetaParams {
  [key: string]: any;
  parsedUrl?: {
    origin: string;
    pathname?: string;
    basePath?: string;
  };
}

export type FieldFormatsStartCommon = Omit<FieldFormatsRegistry, 'init' & 'register'>;
