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

import { VisSavedObject } from './visualize_embeddable';
import { indexPatterns, IIndexPattern } from '../../../../../plugins/data/public';
import { getUISettings, getSavedObjectsClient } from '../np_ready/public/services';

export async function getIndexPattern(
  savedVis: VisSavedObject
): Promise<IIndexPattern | undefined> {
  if (savedVis.vis.type.name !== 'metrics') {
    return savedVis.vis.indexPattern;
  }

  const defaultIndex = getUISettings().get('defaultIndex');

  if (savedVis.vis.params.index_pattern) {
    const indexPatternObjects = await getSavedObjectsClient().find({
      type: 'index-pattern',
      fields: ['title', 'fields'],
      search: `"${savedVis.vis.params.index_pattern}"`,
      searchFields: ['title'],
    });
    const [indexPattern] = indexPatternObjects.savedObjects.map(indexPatterns.getFromSavedObject);
    return indexPattern;
  }

  const savedObject = await getSavedObjectsClient().get('index-pattern', defaultIndex);
  return indexPatterns.getFromSavedObject(savedObject);
}
