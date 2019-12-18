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

/** @public **/
export type ContentType = 'html' | 'text';

/** @public **/
export { IFieldFormat } from './field_format';

interface HtmlConvertOptions {
  field?: any;
  hit?: Record<string, any>;
  meta?: any;
  [propName: string]: any;
}

/** @internal **/
export type HtmlContextTypeConvert = (value: any, options?: HtmlConvertOptions) => string;

/** @internal **/
export type TextContextTypeConvert = (value: any, options?: Record<string, any>) => string;

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
