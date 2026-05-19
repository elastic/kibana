/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare enum SettingsFilter {
  All = 'all',
  SecureOnly = 'secure-only',
  NonSecureOnly = 'non-secure-only',
}
/**
 * Accepts an array of `esSettingName=esSettingValue` strings and parses them into an array of
 * [esSettingName, esSettingValue] tuples optionally filter out secure or non-secure settings.
 * @param rawSettingNameValuePairs Array of strings to parse
 * @param [filter] Optional settings filter.
 */
export declare function parseSettings(
  rawSettingNameValuePairs: string[],
  {
    filter,
  }?: {
    filter: SettingsFilter;
  }
): [string, string][];
