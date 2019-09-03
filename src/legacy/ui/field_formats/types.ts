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

import { Field } from '../../core_plugins/data/public/index_patterns';

export type ContentType = 'html' | 'text';

/** @public **/
export interface IFieldFormat {
  id?: string;
  type: any;
  /**
   * Convert a raw value to a formatted string
   * @param  {any} value
   * @param  {string} [contentType=text] - optional content type, the only two contentTypes
   *                                currently supported are "html" and "text", which helps
   *                                formatters adjust to different contexts
   * @return {string} - the formatted string, which is assumed to be html, safe for
   *                    injecting into the DOM or a DOM attribute
   * @public
   */
  convert: (value: any, contentType?: ContentType) => string;

  /**
   * Get a convert function that is bound to a specific contentType
   * @param  {string} [contentType=text]
   * @return {function} - a bound converter function
   * @public
   */
  getConverterFor: (contentType: ContentType) => Function | null;

  /**
   * Get parameter defaults
   * @return {object} - parameter defaults
   * @public
   */
  getParamDefaults: () => Record<string, any>;

  /**
   * Get the value of a param. This value may be a default value.
   *
   * @param  {string} name - the param name to fetch
   * @return {any}
   * @public
   */
  param: (name: string) => any;

  /**
   * Get all of the params in a single object
   * @return {object}
   * @public
   */
  params: () => Record<string, any>;

  /**
   * Serialize this format to a simple POJO, with only the params
   * that are not default
   *
   * @return {object}
   * @public
   */
  toJSON: () => void;

  /**
   * @property {FieldFormatConvert}
   * @private
   */
  _convert: FieldFormatConvert;
}

/** @internal **/
export type HtmlConventTypeConvert = (
  value: any,
  field?: Field,
  hit?: Record<string, any>,
  meta?: any
) => string;

/** @internal **/
export type TextContextTypeConvert = (value: any) => string;

/** @internal **/
export type FieldFormatConvertFunction = HtmlConventTypeConvert | TextContextTypeConvert;

/** @internal **/
export interface FieldFormatConvert {
  [key: string]: FieldFormatConvertFunction;
}
