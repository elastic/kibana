/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * List of the patterns for the settings names that are supposed to be secure and stored in the keystore.
 */
const SECURE_SETTINGS_LIST = [
  /^xpack\.security\.authc\.realms\.oidc\.[a-zA-Z0-9_]+\.rp\.client_secret$/,
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
