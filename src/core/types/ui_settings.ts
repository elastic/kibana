/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Type } from '@kbn/config-schema';
import { UiCounterMetricType } from '@kbn/analytics';

/**
 * UI element type to represent the settings.
 * @public
 * */
export type UiSettingsType =
  | 'undefined' // I don't know why malformed UiSettings objects exist
  | 'json'
  | 'markdown'
  | 'number'
  | 'select'
  | 'boolean'
  | 'string'
  | 'array'
  | 'image';

/**
 * UiSettings deprecation field options.
 * @public
 * */
export interface DeprecationSettings {
  /** Deprecation message */
  message: string;
  /** Key to documentation links */
  docLinksKey: string;
}

/**
 * UiSettings parameters defined by the plugins.
 * @public
 * */
export interface UiSettingsParams<T = unknown> {
  /** title in the UI */
  name?: string;
  /** default value to fall back to if a user doesn't provide any */
  value?: T;
  /** description provided to a user in UI */
  description?: string;
  /** used to group the configured setting in the UI */
  category?: string[];
  /** array of permitted values for this setting */
  options?: string[];
  /** text labels for 'select' type UI element */
  optionLabels?: Record<string, string>;
  /** a flag indicating whether new value applying requires page reloading */
  requiresPageReload?: boolean;
  /** a flag indicating that value cannot be changed */
  readonly?: boolean;
  /**
   * a flag indicating that value might contain user sensitive data.
   * used by telemetry to mask the value of the setting when sent.
   */
  sensitive?: boolean;
  /** defines a type of UI element {@link UiSettingsType} */
  type?: UiSettingsType;
  /** optional deprecation information. Used to generate a deprecation warning. */
  deprecation?: DeprecationSettings;
  /*
   * Allows defining a custom validation applicable to value change on the client.
   * @deprecated
   * Use schema instead.
   */
  validation?: ImageValidation | StringValidation;
  /*
   * Value validation schema
   * Used to validate value on write and read.
   */
  schema: Type<T>;
  /**
   * Metric to track once this property changes
   * @deprecated
   * Temporary measure until https://github.com/elastic/kibana/issues/83084 is in place
   */
  metric?: {
    type: UiCounterMetricType;
    name: string;
  };
}

/**
 * A sub-set of {@link UiSettingsParams} exposed to the client-side.
 * @public
 * */
export type PublicUiSettingsParams = Omit<UiSettingsParams, 'schema'>;

/**
 * Allows regex objects or a regex string
 * @public
 * */
export type StringValidation = StringValidationRegex | StringValidationRegexString;

/**
 * StringValidation with regex object
 * @public
 * */
export interface StringValidationRegex {
  regex: RegExp;
  message: string;
}

/**
 * StringValidation as regex string
 * @public
 * */
export interface StringValidationRegexString {
  regexString: string;
  message: string;
}

/**
 * @public
 * */
export interface ImageValidation {
  maxSize: {
    length: number;
    description: string;
  };
}

/**
 * Describes the values explicitly set by user.
 * @public
 * */
export interface UserProvidedValues<T = any> {
  userValue?: T;
  isOverridden?: boolean;
}
