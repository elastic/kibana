/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Serializable, SerializableRecord } from '@kbn/utility-types';
import type { ReactNode } from 'react';
import type { FieldFormat } from './field_format';
import type { FieldFormatsRegistry } from './field_formats_registry';

/** @public **/
export type FieldFormatsContentType = 'html' | 'text';

/**
 * Html converter options
 */
export interface HtmlContextTypeOptions {
  field?: { name: string };
  hit?: { highlight?: Record<string, string[]> };
  skipFormattingInStringifiedJSON?: boolean;
}

/**
 * To html converter function
 * @public
 */
export type HtmlContextTypeConvert = (value: any, options?: HtmlContextTypeOptions) => string;

/**
 * Plain text converter options
 * @remark
 */
export interface TextContextTypeOptions {
  skipFormattingInStringifiedJSON?: boolean;
  timezone?: string;
}

/**
 * To plain text converter function
 * @public
 */
export type TextContextTypeConvert = (value: any, options?: TextContextTypeOptions) => string;

/**
 * React converter options (extends HTML options since it can use same context)
 * @public
 */
export interface ReactContextTypeOptions extends HtmlContextTypeOptions {
  /**
   * Optional CSS class name to apply to the root element
   */
  className?: string;
}

/**
 * To React element converter function
 * @public
 *
 * Field formatters can optionally implement this to return a React element
 * directly instead of an HTML string. This is the preferred rendering path
 * for client-side UI as it avoids dangerouslySetInnerHTML.
 *
 * When a formatter provides reactConvert, consumers should prefer using it
 * over htmlConvert for rendering. The text conversion remains unchanged
 * and is used for sorting, filtering, export, and other non-visual operations.
 */
export type ReactContextTypeConvert = (value: any, options?: ReactContextTypeOptions) => ReactNode;

/**
 * Converter function
 * @public
 */
export type FieldFormatConvertFunction = HtmlContextTypeConvert | TextContextTypeConvert;

/** @public **/
export interface FieldFormatConvert {
  text: TextContextTypeConvert;
  html: HtmlContextTypeConvert;
}

/**
 * Extended converter object that includes optional React rendering
 * @public
 */
export interface FieldFormatConvertWithReact extends FieldFormatConvert {
  /**
   * Optional React converter. When provided, UI consumers should prefer
   * this over the HTML converter for rendering formatted values.
   */
  react?: ReactContextTypeConvert;
}

/** @public **/
export enum FIELD_FORMAT_IDS {
  _SOURCE = '_source',
  BOOLEAN = 'boolean',
  BYTES = 'bytes',
  COLOR = 'color',
  CURRENCY = 'currency',
  CUSTOM = 'custom',
  DATE = 'date',
  DATE_NANOS = 'date_nanos',
  DURATION = 'duration',
  GEO_POINT = 'geo_point',
  IP = 'ip',
  NUMBER = 'number',
  PERCENT = 'percent',
  RELATIVE_DATE = 'relative_date',
  STATIC_LOOKUP = 'static_lookup',
  STRING = 'string',
  TRUNCATE = 'truncate',
  URL = 'url',
  HISTOGRAM = 'histogram',
}

/** @public */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FieldFormatConfig = {
  id: FieldFormatId;
  params: FieldFormatParams;
  es?: boolean;
};

/**
 * If a service is being shared on both the client and the server, and
 * the client code requires synchronous access to uiSettings, both client
 * and server should wrap the core uiSettings services in a function
 * matching this signature.
 *
 * This matches the signature of the public `core.uiSettings.get`, and
 * should only be used in scenarios where async access to uiSettings is
 * not possible.
 *
 @public
 */
export type FieldFormatsGetConfigFn<T extends Serializable = Serializable> = (
  key: string,
  defaultOverride?: T
) => T;

export type IFieldFormat = FieldFormat;

/**
 * @string id type is needed for creating custom converters.
 */
export type FieldFormatId = FIELD_FORMAT_IDS | string;

/**
 * Alternative to typeof {@link FieldFormat} but with specified ids
 * @public
 */
export type FieldFormatInstanceType = (new (
  params?: FieldFormatParams,
  getConfig?: FieldFormatsGetConfigFn
) => FieldFormat) & {
  // Static properties:
  id: FieldFormatId;
  title: string;
  hidden?: boolean;
  fieldType: string | string[];
};

/**
 * Params provided when creating a formatter.
 * Params are vary per formatter
 *
 * TODO: support strict typing for params depending on format type
 * https://github.com/elastic/kibana/issues/108158
 */
export type FieldFormatParams<P = {}> = SerializableRecord & P;

/**
 * Params provided by the registry to every field formatter
 *
 * @public
 */
export interface FieldFormatMetaParams {
  parsedUrl?: {
    origin: string;
    pathname?: string;
    basePath?: string;
  };
}

export type FieldFormatsStartCommon = Omit<FieldFormatsRegistry, 'init' | 'register'>;

/**
 * JSON representation of a field formatter configuration.
 * Is used to carry information about how to format data in
 * a data table as part of the column definition.
 *
 * @public
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SerializedFieldFormat<
  P = {},
  TParams extends FieldFormatParams<P> = FieldFormatParams<P>
> = {
  id?: string;
  params?: TParams;
};

export type FormatFactory = <P = {}>(mapping?: SerializedFieldFormat<P>) => IFieldFormat;
