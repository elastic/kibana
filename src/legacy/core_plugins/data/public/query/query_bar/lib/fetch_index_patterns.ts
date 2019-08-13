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

import chrome from 'ui/chrome';
import { isEmpty } from 'lodash';
import { UiSettingsClientContract } from 'src/core/public';
import { utils as indexPatternUtils } from '../../../index_patterns';

export async function fetchIndexPatterns(
  indexPatternStrings: string[],
  uiSettings: UiSettingsClientContract
) {
  if (!indexPatternStrings || isEmpty(indexPatternStrings)) {
    return [];
  }

  const searchString = indexPatternStrings.map(string => `"${string}"`).join(' | ');
  const indexPatternsFromSavedObjects = await chrome.getSavedObjectsClient().find({
    type: 'index-pattern',
    fields: ['title', 'fields'],
    search: searchString,
    searchFields: ['title'],
  });

  const exactMatches = indexPatternsFromSavedObjects.savedObjects.filter(savedObject => {
    return indexPatternStrings.includes(savedObject.attributes.title as string);
  });

  const defaultIndex = uiSettings.get('defaultIndex');

  const allMatches =
    exactMatches.length === indexPatternStrings.length
      ? exactMatches
      : [...exactMatches, await fetchDefaultIndexPattern(defaultIndex)];

  return allMatches.map(indexPatternUtils.getFromSavedObject);
}

const fetchDefaultIndexPattern = async (defaultIndex: string) => {
  const savedObjectsClient = chrome.getSavedObjectsClient();
  return await savedObjectsClient.get('index-pattern', defaultIndex);
};
