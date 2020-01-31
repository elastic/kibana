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

import { getUiSettingDefaults } from '../../../ui_setting_defaults';
import { get } from 'lodash';

const uiSettingDefaults = getUiSettingDefaults();
const defaultSearchQueryLanguageSetting = uiSettingDefaults['search:queryLanguage'].value;

export function fetchProvider(index) {
  return async callCluster => {
    const [response, config] = await Promise.all([
      callCluster('get', {
        index,
        id: 'kql-telemetry:kql-telemetry',
        ignore: [404],
      }),
      callCluster('search', {
        index,
        body: { query: { term: { type: 'config' } } },
        ignore: [404],
      }),
    ]);

    const queryLanguageConfigValue = get(
      config,
      'hits.hits[0]._source.config.search:queryLanguage'
    );

    // search:queryLanguage can potentially be in four states in the .kibana index:
    // 1. undefined: this means the user has never touched this setting
    // 2. null: this means the user has touched the setting, but the current value matches the default
    // 3. 'kuery' or 'lucene': this means the user has explicitly selected the given non-default language
    //
    // It's nice to know if the user has never touched the setting or if they tried kuery then
    // went back to the default, so I preserve this info by prefixing the language name with
    // 'default-' when the value in .kibana is undefined (case #1).
    let defaultLanguage;
    if (queryLanguageConfigValue === undefined) {
      defaultLanguage = `default-${defaultSearchQueryLanguageSetting}`;
    } else if (queryLanguageConfigValue === null) {
      defaultLanguage = defaultSearchQueryLanguageSetting;
    } else {
      defaultLanguage = queryLanguageConfigValue;
    }

    const kqlTelemetryDoc = {
      optInCount: 0,
      optOutCount: 0,
      ...get(response, '_source.kql-telemetry', {}),
    };

    return {
      ...kqlTelemetryDoc,
      defaultQueryLanguage: defaultLanguage,
    };
  };
}
