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

import { get } from 'lodash';

export async function collectReferencesDeep(savedObjectClient, objects) {
  const result = [];
  const queue = [...objects];
  while (queue.length !== 0) {
    const itemsToGet = queue.splice(0, queue.length);
    const { saved_objects: savedObjects } = await savedObjectClient.bulkGet(itemsToGet);
    result.push(...savedObjects);
    // All references will be replaced with references once all saved object types are migrated
    const allReferences = [];
    savedObjects.forEach((obj) => {
      allReferences.push(...(obj.references || []));
      allReferences.push(...extractLegacyReferences(obj));
    });
    for (const reference of allReferences) {
      const isInResult = result.findIndex(obj => obj.type === reference.type && obj.id === reference.id) !== -1;
      if (isInResult) continue;
      const isInQueue = queue.findIndex(obj => obj.type === reference.type && obj.id === reference.id) !== -1;
      if (isInQueue) continue;
      queue.push({ type: reference.type, id: reference.id });
    }
  }
  return result;
}

// Function will be used until each type use "references", each type
// will be removed once migrated to new structure
function extractLegacyReferences(savedObject) {
  const legacyReferences = [];
  switch(savedObject.type) {
    case 'dashboard':
      let panels;
      try {
        panels = JSON.parse(get(savedObject, 'attributes.panelsJSON', []));
      } catch (e) {
        panels = [];
      }
      for (const panel of panels) {
        if (panel.type && panel.id) {
          legacyReferences.push({ type: panel.type, id: panel.id });
        }
      }
      break;
    case 'visualization':
      const { savedSearchId } = savedObject.attributes;
      const visIndexPattern = extractSearchSourceIndexPattern(savedObject);
      if (savedSearchId) {
        legacyReferences.push({ type: 'search', id: savedSearchId });
      }
      if (visIndexPattern) {
        legacyReferences.push(visIndexPattern);
      }
      break;
    case 'search':
      const searchIndexPattern = extractSearchSourceIndexPattern(savedObject);
      if (searchIndexPattern) {
        legacyReferences.push(searchIndexPattern);
      }
      break;
  }
  return legacyReferences;
}

function extractSearchSourceIndexPattern(savedObject) {
  const searchSourceJSON = get(savedObject, 'attributes.kibanaSavedObjectMeta.searchSourceJSON');
  try {
    const searchSource = JSON.parse(searchSourceJSON);
    if (searchSource.index) {
      return { type: 'index-pattern', id: searchSource.index };
    }
  } catch (e) {
    // Previous behaviour is to ignore error
  }
}
