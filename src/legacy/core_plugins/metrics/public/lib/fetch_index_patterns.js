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
import { getFromSavedObject } from 'ui/index_patterns/static_utils';

export async function fetchIndexPatterns(indexPatternString) {
  let indexPatternObject;
  const indexPatternsFromSavedObjects = await chrome.getSavedObjectsClient().find({
    type: 'index-pattern',
    fields: ['title', 'fields'],
    search: `"${indexPatternString}"`,
    search_fields: ['title'],
  });
  const exactMatch = indexPatternsFromSavedObjects.savedObjects.find(
    indexPattern => indexPattern.attributes.title === indexPatternString
  );
  if (exactMatch) {
    indexPatternObject = getFromSavedObject(exactMatch);
  }
  return indexPatternObject;
}
