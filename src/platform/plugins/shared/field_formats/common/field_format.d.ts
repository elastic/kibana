/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type {
  FieldFormatsGetConfigFn,
  FieldFormatInstanceType,
  TextContextTypeOptions,
  FieldFormatMetaParams,
  FieldFormatParams,
} from './types';
import type {
  ReactContextTypeConvert,
  ReactConvertFunction,
  TextContextTypeConvert,
} from './types';
export declare abstract class FieldFormat {
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
  protected reactConvert: ReactConvertFunction | undefined;
  /**
   * React-based converter. Handles arrays and delegates single values to `reactConvert`
   * (if overridden) or the default text/highlight logic.
   *
   * Do NOT override this method in subclasses — override `reactConvert` instead so that
   * array handling is always applied correctly.
   *
   * @public
   */
  convertToReact: ReactContextTypeConvert;
  /**
   * Plain-text converter for a single scalar value. Override this in subclasses.
   * Arrays are handled by the base class before this method is called.
   *
   * @protected
   */
  protected textConvert: TextContextTypeConvert | undefined;
  /**
   * Convert a raw value to a formatted string.
   * Handles arrays automatically (JSON-encodes them).
   * @param  {unknown} value
   * @param  {TextContextTypeOptions} [options]
   * @return {string} - the formatted string
   * @public
   */
  convertToText(value: unknown, options?: TextContextTypeOptions): string;
  /**
   * @property {Function} - ref to child class
   * @internal
   */
  type: typeof FieldFormat;
  allowsNumericalAggregations?: boolean;
  protected readonly _params: FieldFormatParams & FieldFormatMetaParams;
  protected getConfig: FieldFormatsGetConfigFn | undefined;
  constructor(
    _params?: FieldFormatParams & FieldFormatMetaParams,
    getConfig?: FieldFormatsGetConfigFn
  );
  /**
   * Get parameter defaults
   * @return {object} - parameter defaults
   * @public
   */
  getParamDefaults(): FieldFormatParams;
  /**
   * Get the value of a param. This value may be a default value.
   *
   * @param  {string} name - the param name to fetch
   * @return {any} TODO: https://github.com/elastic/kibana/issues/108158
   * @public
   */
  param(name: string): any;
  /**
   * Get all of the params in a single object
   * @return {object}
   * @public
   */
  params(): FieldFormatParams & FieldFormatMetaParams;
  /**
   * Serialize this format to a simple POJO, with only the params
   * that are not default
   *
   * @return {object}
   * @public
   */
  toJSON(): {
    id: string;
    params: (import('@kbn/utility-types').SerializableRecord & FieldFormatMetaParams) | undefined;
  };
  static from(convertFn: TextContextTypeConvert): FieldFormatInstanceType;
  static isInstanceOfFieldFormat(fieldFormat: unknown): fieldFormat is FieldFormat;
  protected checkForMissingValueText(val: unknown): string | void;
  protected checkForMissingValueReact(val: unknown): ReactNode | void;
}
