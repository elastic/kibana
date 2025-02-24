/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UiSettingsType } from '@kbn/core-ui-settings-common';

/**
 * This is a local type equivalent to {@link UiSettingsType} for flexibility.
 * @public
 */
export type SettingType = UiSettingsType;

/**
 * A narrowing type representing all {@link SettingType} values that correspond
 * to an `array` primitive type value.
 * @public
 */
export type ArraySettingType = Extract<SettingType, 'array'>;

/**
 * A narrowing type representing all {@link SettingType} values that correspond
 * to an `boolean` primitive type value.
 * @public
 */
export type BooleanSettingType = Extract<SettingType, 'boolean'>;

/**
 * A narrowing type representing all {@link SettingType} values that correspond
 * to an `number` primitive type value.
 * @public
 */
export type NumberSettingType = Extract<SettingType, 'number' | 'bigint'>;

/**
 * A narrowing type representing all {@link SettingType} values that correspond
 * to an `string` primitive type value.
 * @public
 */
export type StringSettingType = Extract<
  SettingType,
  'color' | 'image' | 'json' | 'markdown' | 'select' | 'string'
>;

/**
 * A narrowing type representing all {@link SettingType} values that correspond
 * to an `undefined` type value.
 * @public
 */
export type UndefinedSettingType = Extract<SettingType, 'undefined'>;

/**
 * A type representing all possible values corresponding to a given {@link SettingType}.
 */
export type Value = string | boolean | number | Array<string | number> | undefined | null;

// prettier-ignore
/**
 * This is a narrowing type, which finds the correct primitive type based on a
 * given {@link SettingType}.
 * @public
 */
export type KnownTypeToValue<T extends SettingType = SettingType> =
  T extends 'color' | 'image' | 'json' | 'markdown' | 'select' | 'string' ? string :
  T extends 'boolean' ? boolean :
  T extends 'number' | 'bigint' ? number :
  T extends 'array' ? Array<string | number> :
  T extends 'undefined' ? undefined:
  never;
