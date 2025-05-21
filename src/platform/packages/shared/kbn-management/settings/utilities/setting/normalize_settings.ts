/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SettingType, UiSetting, UiSettingMetadata, Value } from '@kbn/management-settings-types';

type RawSettings = Record<string, UiSetting<SettingType>>;

/**
 * UiSettings have an extremely permissive set of types, which makes it difficult to code
 * against them.  Sometimes the `type` field-- the property that tells us what input to render
 * to change the setting-- is missing.  This function attempts to derive that `type` property
 * from the `value` or `userValue` fields of the setting.
 *
 * @param setting The setting from which to derive the type.
 * @returns The derived {@link SettingType}.
 */
const deriveType = (setting: UiSetting<SettingType>): SettingType => {
  const { type, value: defaultValue, userValue: savedValue } = setting;

  if (type) {
    return type;
  }

  if (Array.isArray(defaultValue) || Array.isArray(savedValue)) {
    return 'array';
  }

  const typeofVal = defaultValue != null ? typeof defaultValue : typeof savedValue;

  if (typeofVal === 'bigint') {
    return 'number';
  }

  if (typeofVal === 'boolean') {
    return 'boolean';
  }

  if (typeofVal === 'symbol' || typeofVal === 'object' || typeofVal === 'function') {
    throw new Error(
      `incompatible SettingType: '${setting.name}' type ${typeofVal} | ${JSON.stringify(setting)}`
    );
  }

  return typeofVal;
};

const isNumericValue = (value: unknown): boolean => {
  return value != null && value !== '' && !isNaN(Number(value.toString()));
};

/**
 * UiSettings have an extremely permissive set of types, which makes it difficult to code
 * against them.  The `value` property is typed as `unknown`, but the setting has a `type`
 * property that tells us what type the value should be.  This function attempts to cast
 * the value from a given type.
 *
 * @param type The {@link SettingType} to which to cast the value.
 * @param value The value to cast.
 */
const deriveValue = (type: SettingType, value: unknown): Value => {
  if (value === null) {
    return null;
  }

  switch (type) {
    case 'color':
    case 'image':
    case 'json':
    case 'markdown':
    case 'string':
      return value as string;
    case 'number':
      return isNumericValue(value) ? Number(value) : undefined;
    case 'boolean':
      return Boolean(value);
    case 'array':
      return Array.isArray(value) ? value : [value];
    default:
      return value as string;
  }
};

/**
 * UiSettings have an extremely permissive set of types, which makes it difficult to code
 * against them.  The `type` and `value` properties are inherently related, and important,
 * but in some cases one or both are missing.  This function attempts to normalize the
 * settings to a strongly-typed format, {@link UiSettingMetadata} based on the information
 * in the setting at runtime.
 *
 * @param rawSettings The raw settings retrieved from the {@link IUiSettingsClient}, which
 * may be missing the `type` or `value` properties.
 * @returns A mapped collection of normalized {@link UiSetting} objects.
 */
export const normalizeSettings = (rawSettings: RawSettings): Record<string, UiSettingMetadata> => {
  const normalizedSettings: Record<string, UiSettingMetadata> = {};

  const entries = Object.entries(rawSettings);

  entries.forEach(([id, rawSetting]) => {
    const type = deriveType(rawSetting);
    const value = deriveValue(type, rawSetting.value);

    const setting = {
      ...rawSetting,
      type,
      value,
    };

    if (setting) {
      normalizedSettings[id] = setting;
    }
  });

  return normalizedSettings;
};
