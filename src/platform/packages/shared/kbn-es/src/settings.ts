/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * List of the patterns for the settings names that are supposed to be secure and stored in the keystore.
 */
const SECURE_SETTINGS_LIST = [
  /^xpack\.security\.authc\.realms\.oidc\.[a-zA-Z0-9_]+\.rp\.client_secret$/,
  /^xpack\.security\.authc\.realms\.jwt\.[a-zA-Z0-9_]+\.client_authentication\.shared_secret$/,
  /^xpack\.security\.http\.ssl\.keystore\.secure_password$/,
  /^telemetry\.secret_token$/,
  /^telemetry\.api_key$/,
];

function isSecureSetting(settingName: string) {
  return SECURE_SETTINGS_LIST.some((secureSettingNameRegex) =>
    secureSettingNameRegex.test(settingName)
  );
}

export enum SettingsFilter {
  All = 'all',
  SecureOnly = 'secure-only',
  NonSecureOnly = 'non-secure-only',
}

/**
 * Defaults `esArgs` to single-node discovery, which skips the multi-second cluster
 * bootstrap wait, unless the caller configured discovery themselves.
 */
export function defaultToSingleNodeDiscovery(esArgs: string | string[] = []): string[] {
  const args = typeof esArgs === 'string' ? [esArgs] : esArgs;
  const hasDiscoverySetting = args.some((arg) => {
    const [settingName] = arg.split('=');
    return settingName.startsWith('discovery.') || settingName === 'cluster.initial_master_nodes';
  });

  return hasDiscoverySetting ? args : ['discovery.type=single-node', ...args];
}

/**
 * Accepts an array of `esSettingName=esSettingValue` strings and parses them into an array of
 * [esSettingName, esSettingValue] tuples optionally filter out secure or non-secure settings.
 * @param rawSettingNameValuePairs Array of strings to parse
 * @param [filter] Optional settings filter.
 */
export function parseSettings(
  rawSettingNameValuePairs: string[],
  { filter }: { filter: SettingsFilter } = { filter: SettingsFilter.All }
) {
  const settings: Array<[string, string]> = [];
  for (const rawSettingNameValuePair of rawSettingNameValuePairs) {
    const [settingName, settingValue] = rawSettingNameValuePair.split('=');

    const includeSetting =
      filter === SettingsFilter.All ||
      (filter === SettingsFilter.SecureOnly && isSecureSetting(settingName)) ||
      (filter === SettingsFilter.NonSecureOnly && !isSecureSetting(settingName));
    if (includeSetting) {
      settings.push([settingName, settingValue]);
    }
  }

  return settings;
}
