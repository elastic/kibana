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
import { StaticIndexPattern, getFromSavedObject } from 'ui/index_patterns';
import { VisSavedObject } from 'ui/visualize/loader/types';

export async function getIndexPattern(
  savedVis: VisSavedObject
): Promise<StaticIndexPattern | undefined> {
  if (savedVis.vis.type.name !== 'metrics') {
    return savedVis.vis.indexPattern;
  }

  const config = chrome.getUiSettingsClient();
  const savedObjectsClient = chrome.getSavedObjectsClient();
  const defaultIndex = config.get('defaultIndex');

  if (savedVis.vis.params.index_pattern) {
    const indexPatternObjects = await savedObjectsClient.find({
      type: 'index-pattern',
      fields: ['title', 'fields'],
      search: `"${savedVis.vis.params.index_pattern}"`,
      searchFields: ['title'],
    });
    const [indexPattern] = indexPatternObjects.savedObjects.map(getFromSavedObject);
    return indexPattern;
  }

  const savedObject = await savedObjectsClient.get('index-pattern', defaultIndex);
  return getFromSavedObject(savedObject);
}
