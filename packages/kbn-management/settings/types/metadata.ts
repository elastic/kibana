/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PublicUiSettingsParams, UserProvidedValues } from '@kbn/core/public';
import { KnownTypeToValue, SettingType } from './setting_type';

/**
 * Creating this type based on {@link UiSettingsClientCommon} and exporting for ease.
 */
export type UiSetting<T> = PublicUiSettingsParams & UserProvidedValues<T>;

/**
 * This is an type-safe abstraction over the {@link UiSetting} type, whose fields
 * are not only optional, but also not strongly typed to
 * {@link @kbn/core-ui-settings-common#UiSettingsType}.
 *
 * @public
 */
export interface UiSettingMetadata<
  T extends SettingType = SettingType,
  V = KnownTypeToValue<T> | null
> extends UiSetting<V> {
  /**
   * The type of setting being represented.
   * @see{@link SettingType}
   */
  type: T;
  /** The default value in Kibana for the setting. */
  value?: V;
  /** The value saved by the user. */
  userValue?: V;
}

/**
 * This is an type-safe abstraction over the {@link UiSetting} `array` type.
 * @public
 */
export type ArrayUiSettingMetadata = UiSettingMetadata<'array'>;

/**
 * This is an type-safe abstraction over the {@link UiSetting} `boolean` type.
 * @public
 */
export type BooleanUiSettingMetadata = UiSettingMetadata<'boolean'>;

/**
 * This is an type-safe abstraction over the {@link UiSetting} `color` type.
 * @public
 */
export type ColorUiSettingMetadata = UiSettingMetadata<'color'>;

/**
 * This is an type-safe abstraction over the {@link UiSetting} `image` type.
 * @public
 */
export type ImageUiSettingMetadata = UiSettingMetadata<'image'>;

/**
 * This is an type-safe abstraction over the {@link UiSetting} `json` type.
 * @public
 */
export type JsonUiSettingMetadata = UiSettingMetadata<'json'>;

/**
 * This is an type-safe abstraction over the {@link UiSetting} `markdown` type.
 * @public
 */
export type MarkdownUiSettingMetadata = UiSettingMetadata<'markdown'>;

/**
 * This is an type-safe abstraction over the {@link UiSetting} `number` type.
 * @public
 */
export type NumberUiSettingMetadata = UiSettingMetadata<'number'>;

/**
 * This is an type-safe abstraction over the {@link UiSetting} `select` type.
 * @public
 */
export type SelectUiSettingMetadata = UiSettingMetadata<'select'>;

/**
 * This is an type-safe abstraction over the {@link UiSetting} `string` type.
 * @public
 */
export type StringUiSettingMetadata = UiSettingMetadata<'string'>;

/**
 * This is an type-safe abstraction over the {@link UiSetting} `undefined` type.
 * @public
 */
export type UndefinedUiSettingMetadata = UiSettingMetadata<'undefined'>;

// prettier-ignore
/**
 * This is a narrowing type, which finds the correct {@link UiSettingMetadata}
 * type based on a given {@link SettingType}.
 * @public
 */
export type KnownTypeToMetadata<T extends SettingType> =
  T extends 'array' ? ArrayUiSettingMetadata
  : T extends 'boolean' ? BooleanUiSettingMetadata
  : T extends 'color' ? ColorUiSettingMetadata
  : T extends 'image' ? ImageUiSettingMetadata
  : T extends 'json' ? JsonUiSettingMetadata
  : T extends 'markdown' ? MarkdownUiSettingMetadata
  : T extends 'number' ? NumberUiSettingMetadata
  : T extends 'select' ? SelectUiSettingMetadata
  : T extends 'string' ? StringUiSettingMetadata
  : T extends 'undefined' ? UndefinedUiSettingMetadata
  : never;
