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

export async function collectIndexPatterns(savedObjectsClient, panels) {
  const docs = panels.reduce((acc, panel) => {
    const { kibanaSavedObjectMeta, savedSearchId } = panel.attributes;

    if (kibanaSavedObjectMeta && kibanaSavedObjectMeta.searchSourceJSON && !savedSearchId) {
      let searchSourceData;
      try {
        searchSourceData = JSON.parse(kibanaSavedObjectMeta.searchSourceJSON);
      } catch (err) {
        return acc;
      }

      if (searchSourceData.index && !acc.find(s => s.id === searchSourceData.index)) {
        acc.push({ type: 'index-pattern', id: searchSourceData.index });
      }
    }
    return acc;
  }, []);

  if (docs.length === 0) return [];

  const { saved_objects: savedObjects } = await savedObjectsClient.bulkGet(docs);
  return savedObjects;
}
