/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transform, size, cloneDeep, get, defaults } from 'lodash';
import { createCustomFieldFormat } from './converters/custom';
import {
  FieldFormatsGetConfigFn,
  FieldFormatsContentType,
  FieldFormatInstanceType,
  FieldFormatConvert,
  FieldFormatConvertFunction,
  HtmlContextTypeOptions,
  TextContextTypeOptions,
  FieldFormatMetaParams,
  FieldFormatParams,
} from './types';
import { htmlContentTypeSetup, textContentTypeSetup, TEXT_CONTEXT_TYPE } from './content_types';
import { HtmlContextTypeConvert, TextContextTypeConvert } from './types';

const DEFAULT_CONTEXT_TYPE = TEXT_CONTEXT_TYPE;

export abstract class FieldFormat {
  /**
   * @property {string} - Field Format Id
   * @static
   * @public
   */
  static id: string;

  /**
   * Hidden field formats can only be accessed directly by id,
   * They won't appear in field format editor UI,
   * But they can be accessed and used from code internally.
   *
   * @property {boolean} -  Is this a hidden field format
   * @static
   * @public
   */
  static hidden: boolean;

  /**
   * @property {string} -  Field Format Title
   * @static
   * @public
   */
  static title: string;

  /**
   * @property {string} - Field Format Type
   * @private
   */
  static fieldType: string | string[];

  /**
   * @property {FieldFormatConvert}
   * @private
   * have to remove the private because of
   * https://github.com/Microsoft/TypeScript/issues/17293
   */
  convertObject: FieldFormatConvert | undefined;

  /**
   * @property {htmlConvert}
   * @protected
   * have to remove the protected because of
   * https://github.com/Microsoft/TypeScript/issues/17293
   */
  htmlConvert: HtmlContextTypeConvert | undefined;

  /**
   * @property {textConvert}
   * @protected
   * have to remove the protected because of
   * https://github.com/Microsoft/TypeScript/issues/17293
   */
  textConvert: TextContextTypeConvert | undefined;

  /**
   * @property {Function} - ref to child class
   * @private
   */
  public type = this.constructor as typeof FieldFormat;
  public allowsNumericalAggregations?: boolean;

  protected readonly _params: FieldFormatParams & FieldFormatMetaParams;
  protected getConfig: FieldFormatsGetConfigFn | undefined;

  constructor(
    _params: FieldFormatParams & FieldFormatMetaParams = {},
    getConfig?: FieldFormatsGetConfigFn
  ) {
    this._params = _params;

    if (getConfig) {
      this.getConfig = getConfig;
    }
  }

  /**
   * Convert a raw value to a formatted string
   * @param  {unknown} value
   * @param  {string} [contentType=text] - optional content type, the only two contentTypes
   *                                currently supported are "html" and "text", which helps
   *                                formatters adjust to different contexts
   * @return {string} - the formatted string, which is assumed to be html, safe for
   *                    injecting into the DOM or a DOM attribute
   * @public
   */
  convert(
    value: unknown,
    contentType: FieldFormatsContentType = DEFAULT_CONTEXT_TYPE,
    options?: HtmlContextTypeOptions | TextContextTypeOptions
  ): string {
    const converter = this.getConverterFor(contentType);

    if (converter) {
      return converter.call(this, value, options);
    }

    // TODO: should be "return `${value}`;", but might be a breaking change
    return value as string;
  }

  /**
   * Get a convert function that is bound to a specific contentType
   * @param  {string} [contentType=text]
   * @return {function} - a bound converter function
   * @public
   */
  getConverterFor(
    contentType: FieldFormatsContentType = DEFAULT_CONTEXT_TYPE
  ): FieldFormatConvertFunction {
    if (!this.convertObject) {
      this.convertObject = this.setupContentType();
    }

    return this.convertObject[contentType];
  }

  /**
   * Get parameter defaults
   * @return {object} - parameter defaults
   * @public
   */
  getParamDefaults(): FieldFormatParams {
    return {};
  }

  /**
   * Get the value of a param. This value may be a default value.
   *
   * @param  {string} name - the param name to fetch
   * @return {any} TODO: https://github.com/elastic/kibana/issues/108158
   * @public
   */
  param(name: string): any {
    const val = get(this._params, name);

    if (val || val === false || val === 0) {
      // truthy, false, or 0 are fine
      // '', NaN, null, undefined, etc are not
      return val;
    }

    return get(this.getParamDefaults(), name);
  }

  /**
   * Get all of the params in a single object
   * @return {object}
   * @public
   */
  params(): FieldFormatParams & FieldFormatMetaParams {
    return cloneDeep(defaults({}, this._params, this.getParamDefaults()));
  }

  /**
   * Serialize this format to a simple POJO, with only the params
   * that are not default
   *
   * @return {object}
   * @public
   */
  toJSON() {
    const id = this.type.id;
    const defaultsParams = this.getParamDefaults() || {};

    const params = transform(
      this._params,
      (uniqParams: FieldFormatParams & FieldFormatMetaParams, val, param: string) => {
        if (param === 'parsedUrl') return;
        if (param && val !== get(defaultsParams, param)) {
          uniqParams[param] = val;
        }
      },
      {}
    );

    return {
      id,
      params: size(params) ? params : undefined,
    };
  }

  static from(convertFn: FieldFormatConvertFunction): FieldFormatInstanceType {
    return createCustomFieldFormat(convertFn);
  }

  setupContentType(): FieldFormatConvert {
    return {
      text: textContentTypeSetup(this, this.textConvert),
      html: htmlContentTypeSetup(this, this.htmlConvert),
    };
  }

  static isInstanceOfFieldFormat(fieldFormat: unknown): fieldFormat is FieldFormat {
    return Boolean(fieldFormat && typeof fieldFormat === 'object' && 'convert' in fieldFormat);
  }
}
