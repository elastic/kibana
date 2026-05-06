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
import { transform, size, cloneDeep, get, defaults, isFunction } from 'lodash';
import { EMPTY_LABEL, MISSING_TOKEN, NULL_LABEL } from '@kbn/field-formats-common';
import { createCustomFieldFormat } from './converters/custom';
import { asPrettyString, formatReactArray } from './utils';
import type {
  FieldFormatsGetConfigFn,
  FieldFormatInstanceType,
  TextContextTypeOptions,
  FieldFormatMetaParams,
  FieldFormatParams,
} from './types';
import { getHighlightReact } from './utils/highlight';
import type {
  ReactContextTypeConvert,
  RenderConvertFunction,
  TextContextTypeConvert,
} from './types';

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
   * Single-value React converter. Override this in subclasses to customize React rendering
   * for individual (non-array) values. The public `convertToReact` method handles array
   * wrapping automatically and delegates here for scalar values.
   *
   * When defined, you are responsible for missing-value and highlight handling.
   *
   * @protected
   */
  protected renderConvert: RenderConvertFunction | undefined;

  /**
   * React-based converter. Handles arrays and delegates single values to `renderConvert`
   * (if overridden) or the default text/highlight logic.
   *
   * Do NOT override this method in subclasses — override `renderConvert` instead so that
   * array handling is always applied correctly.
   *
   * @public
   */
  convertToReact: ReactContextTypeConvert = (val, options) => {
    // Arrays: bracket/comma rendering with React nodes.
    // Single-element arrays and empty arrays are passed through without brackets.
    if (Array.isArray(val)) {
      return formatReactArray(val, (v) => this.convertToReact(v, options));
    }

    if (this.renderConvert) {
      return this.renderConvert(val, options);
    }

    const missing = this.checkForMissingValueReact(val);
    if (missing) return missing;

    const formatted = this.textConvert
      ? this.textConvert(val, options)
      : asPrettyString(val, options);
    const fieldName = options?.field?.name;
    const highlights = fieldName ? options?.hit?.highlight?.[fieldName] : undefined;
    // getHighlightReact expects a string; guard against edge cases where convert() returns non-string
    return highlights && typeof formatted === 'string'
      ? getHighlightReact(formatted, highlights)
      : formatted;
  };

  /**
   * Plain-text converter for a single scalar value. Override this in subclasses.
   * Arrays are handled by the base class before this method is called.
   *
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
   * Convert a raw value to a formatted string.
   * Handles arrays automatically (JSON-encodes them).
   * @param  {unknown} value
   * @param  {TextContextTypeOptions} [options]
   * @return {string} - the formatted string
   * @public
   */
  convertToText(value: unknown, options?: TextContextTypeOptions): string {
    if (!value || !isFunction((value as any).map)) {
      return (this.textConvert ?? asPrettyString).call(this, value, options);
    }
    return this.convertArray(value as unknown[], options);
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

  static from(convertFn: TextContextTypeConvert): FieldFormatInstanceType {
    return createCustomFieldFormat(convertFn);
  }

  protected convertArray(value: unknown[], options?: TextContextTypeOptions): string {
    return JSON.stringify(value.map((v) => this.convertToText(v, options)));
  }

  static isInstanceOfFieldFormat(fieldFormat: unknown): fieldFormat is FieldFormat {
    return Boolean(
      fieldFormat &&
        typeof fieldFormat === 'object' &&
        'convertToText' in fieldFormat &&
        'convertToReact' in fieldFormat
    );
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
