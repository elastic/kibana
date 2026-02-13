/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import { transform, size, cloneDeep, get, defaults } from 'lodash';
import { EMPTY_LABEL, MISSING_TOKEN, NULL_LABEL } from '@kbn/field-formats-common';
import { createCustomFieldFormat } from './converters/custom';
import type {
  FieldFormatsGetConfigFn,
  FieldFormatsContentType,
  FieldFormatInstanceType,
  FieldFormatConvertFunction,
  HtmlContextTypeOptions,
  TextContextTypeOptions,
  ReactContextTypeOptions,
  FieldFormatMetaParams,
  FieldFormatParams,
  FieldFormatConvertWithReact,
} from './types';
import {
  htmlContentTypeSetup,
  textContentTypeSetup,
  reactContentTypeSetup,
  TEXT_CONTEXT_TYPE,
} from './content_types';
import type {
  HtmlContextTypeConvert,
  TextContextTypeConvert,
  ReactContextTypeConvert,
} from './types';

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
   * @internal
   */
  static fieldType: string | string[];

  /**
   * @property {FieldFormatConvertWithReact}
   * @internal
   * have to remove the private because of
   * https://github.com/Microsoft/TypeScript/issues/17293
   */
  convertObject: FieldFormatConvertWithReact | undefined;

  /**
   * HTML conversion function for formatting values as HTML strings.
   *
   * @deprecated Use `reactConvert` instead for new formatters. The HTML conversion
   * path uses `dangerouslySetInnerHTML` which poses security risks and prevents
   * React's reconciliation optimizations.
   *
   * This property is maintained for backward compatibility with existing formatters
   * and third-party plugins. New formatters should implement `reactConvert` instead.
   *
   * @see reactConvert for the recommended approach
   * @see README.md for migration guidance
   *
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
   * @property {reactConvert}
   * @protected
   * Optional React conversion function. When implemented, consumers should
   * prefer using this over htmlConvert for rendering formatted values.
   * This avoids dangerouslySetInnerHTML and provides a more React-native
   * rendering path.
   *
   * have to remove the protected because of
   * https://github.com/Microsoft/TypeScript/issues/17293
   */
  reactConvert: ReactContextTypeConvert | undefined;

  /**
   * @property {Function} - ref to child class
   * @internal
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
    return this.getConverterFor(contentType).call(this, value, options);
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

    return this.convertObject[contentType] ?? this.convertObject.text;
  }

  /**
   * Convert a raw value to a React element for rendering.
   *
   * Returns a React element if this formatter supports React rendering,
   * or undefined if it does not (in which case consumers should fall back
   * to the HTML conversion via a legacy adapter).
   *
   * @param value - The value to format
   * @param options - Optional context (field, hit, highlight, className)
   * @returns A React element, or undefined if React rendering is not supported
   * @public
   */
  convertToReact(value: unknown, options?: ReactContextTypeOptions): ReactNode | undefined {
    if (!this.convertObject) {
      this.convertObject = this.setupContentType();
    }

    const reactConverter = this.convertObject.react;
    if (!reactConverter) {
      return undefined;
    }

    return reactConverter.call(this, value, options);
  }

  /**
   * Check if this formatter supports React rendering.
   *
   * @returns true if the formatter has a reactConvert implementation
   * @public
   */
  hasReactSupport(): boolean {
    if (!this.convertObject) {
      this.convertObject = this.setupContentType();
    }

    return this.convertObject.react !== undefined;
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

  setupContentType(): FieldFormatConvertWithReact {
    return {
      text: textContentTypeSetup(this, this.textConvert),
      html: htmlContentTypeSetup(this, this.htmlConvert),
      react: reactContentTypeSetup(this, this.reactConvert),
    };
  }

  static isInstanceOfFieldFormat(fieldFormat: unknown): fieldFormat is FieldFormat {
    return Boolean(fieldFormat && typeof fieldFormat === 'object' && 'convert' in fieldFormat);
  }

  protected checkForMissingValueText(val: unknown): string | void {
    if (val === '') {
      return EMPTY_LABEL;
    }
    if (val == null || val === MISSING_TOKEN) {
      return NULL_LABEL;
    }
  }

  protected checkForMissingValueHtml(val: unknown): string | void {
    if (val === '') {
      return `<span class="ffString__emptyValue">${EMPTY_LABEL}</span>`;
    }
    if (val == null || val === MISSING_TOKEN) {
      return `<span class="ffString__emptyValue">${NULL_LABEL}</span>`;
    }
  }
}
