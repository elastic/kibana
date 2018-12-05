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

export async function getIndexPatternObject(req, indexPatternString) {
  // getting the matching index pattern
  const savedObjectClient = req.getSavedObjectsClient();
  const indexPatternObjects = await savedObjectClient.find({
    type: 'index-pattern',
    fields: ['title', 'fields'],
    search: `"${indexPatternString}"`,
    search_fields: ['title'],
  });

  // getting the index pattern fields
  const indexPatterns = indexPatternObjects.saved_objects
    .filter(obj => obj.attributes.title === indexPatternString)
    .map(indexPattern => {
      const { title, fields } = indexPattern.attributes;
      return {
        title,
        fields: JSON.parse(fields),
      };
    });
  return indexPatterns.length === 1 ? indexPatterns[0] : null;
}
