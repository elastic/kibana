/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React from 'react';
import { transform, size, cloneDeep, get, defaults } from 'lodash';
import { EMPTY_LABEL, MISSING_TOKEN, NULL_LABEL } from '@kbn/field-formats-common';
import { createCustomFieldFormat } from './converters/custom';
import { formatReactArray } from './utils';
import type {
  FieldFormatsGetConfigFn,
  FieldFormatsContentType,
  FieldFormatInstanceType,
  FieldFormatConvert,
  FieldFormatConvertFunction,
  TextContextTypeOptions,
  FieldFormatMetaParams,
  FieldFormatParams,
} from './types';
import { textContentTypeSetup, TEXT_CONTEXT_TYPE } from './content_types';
import { getHighlightReact } from './utils/highlight';
import type {
  ReactContextTypeConvert,
  ReactContextTypeSingleConvert,
  TextContextTypeConvert,
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
   * @property {FieldFormatConvert}
   * @internal
   * have to remove the private because of
   * https://github.com/Microsoft/TypeScript/issues/17293
   */
  convertObject: FieldFormatConvert | undefined;

  /**
   * Single-value React converter. Override this in subclasses to customize React rendering
   * for individual (non-array) values. The public `reactConvert` method handles array
   * wrapping automatically and delegates here for scalar values.
   *
   * @property {reactConvertSingle}
   * @protected
   */
  protected reactConvertSingle: ReactContextTypeSingleConvert | undefined;

  /**
   * React-based converter. Handles arrays and delegates single values to `reactConvertSingle`
   * (if overridden) or the default text/highlight logic.
   *
   * Do NOT override this method in subclasses — override `reactConvertSingle` instead so that
   * array handling is always applied correctly.
   *
   * @property {reactConvert}
   * @protected
   */
  reactConvert: ReactContextTypeConvert = (val, options) => {
    // Arrays: bracket/comma rendering with React nodes.
    // Single-element arrays and empty arrays are passed through without brackets.
    if (Array.isArray(val)) {
      return formatReactArray(val, (v) => this.reactConvert(v, options));
    }

    if (this.reactConvertSingle) {
      return this.reactConvertSingle(val, options);
    }

    const missing = this.checkForMissingValueReact(val);
    if (missing) return missing;

    const formatted = this.textConvert
      ? this.textConvert(val, options)
      : this.convert(val, TEXT_CONTEXT_TYPE, options);
    const fieldName = options?.field?.name;
    const highlights = fieldName ? options?.hit?.highlight?.[fieldName] : undefined;
    // getHighlightReact expects a string; guard against edge cases where convert() returns non-string
    return highlights && typeof formatted === 'string'
      ? getHighlightReact(formatted, highlights)
      : formatted;
  };

  /**
   * @property {textConvert}
   * @protected
   */
  protected textConvert: TextContextTypeConvert | undefined;

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
   * @param  {string} [contentType=text] - optional content type which helps
   *                                formatters adjust to different contexts
   * @return {string} - the formatted string
   * @public
   */
  convert(
    value: unknown,
    contentType: FieldFormatsContentType = DEFAULT_CONTEXT_TYPE,
    options?: TextContextTypeOptions
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

  protected checkForMissingValueReact(val: unknown): ReactNode | void {
    if (val === '') {
      return <span className="ffString__emptyValue">{EMPTY_LABEL}</span>;
    }
    if (val == null || val === MISSING_TOKEN) {
      return <span className="ffString__emptyValue">{NULL_LABEL}</span>;
    }
  }
}
