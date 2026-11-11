/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SettingRow } from './types';

export type ConfigValue = string | number | boolean | null | ConfigValue[] | ConfigObject;
export interface ConfigObject {
  readonly [key: string]: ConfigValue;
}

// Matched against the last segment of a key, e.g. elasticsearch.password or xpack.encryptedSavedObjects.encryptionKey.
const SECRET_NAME = /(password|secret|token|key)$/i;
const MASK = '••••';

/** Masks values of settings that look like credentials, so the TUI can be shown on a shared screen. */
export const formatValue = (key: string, value: ConfigValue): string => {
  if (SECRET_NAME.test(key.slice(key.lastIndexOf('.') + 1))) {
    return MASK;
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
};

const isConfigObject = (value: ConfigValue): value is ConfigObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Flattens nested config into dotted keys; arrays stay whole, like Kibana's own settings. */
export const flattenConfig = (
  config: ConfigObject,
  prefix = ''
): ReadonlyArray<[string, ConfigValue]> =>
  Object.entries(config).flatMap(([key, value]): Array<[string, ConfigValue]> => {
    const path = prefix ? `${prefix}.${key}` : key;
    return isConfigObject(value) && Object.keys(value).length > 0
      ? [...flattenConfig(value, path)]
      : [[path, value]];
  });

export const sortRows = (rows: readonly SettingRow[]): readonly SettingRow[] =>
  [...rows].sort((a, b) => a.key.localeCompare(b.key));
