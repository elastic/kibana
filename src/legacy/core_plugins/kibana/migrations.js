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

import { get, set } from 'lodash';

export default {
  search: {
    '7.0.0': (doc) => {
      // Set new "references" attribute
      doc.references = doc.references || [];
      // Migrate index pattern
      const searchSourceJSON = get(doc, 'attributes.kibanaSavedObjectMeta.searchSourceJSON');
      if (
        typeof searchSourceJSON !== 'string' &&
        searchSourceJSON !== undefined &&
        searchSourceJSON !== null
      ) {
        throw new Error(`searchSourceJSON is not a string on search "${doc.id}"`);
      }
      if (searchSourceJSON) {
        let searchSource;
        try {
          searchSource = JSON.parse(searchSourceJSON);
        } catch (e) {
          throw new Error(
            `Failed to parse searchSourceJSON: "${searchSourceJSON}" because "${
              e.message
            }" on search "${doc.id}"`
          );
        }
        if (searchSource.index) {
          doc.references.push({
            name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
            type: 'index-pattern',
            id: searchSource.index,
          });
          searchSource.index = 'kibanaSavedObjectMeta.searchSourceJSON.index';
          set(doc, 'attributes.kibanaSavedObjectMeta.searchSourceJSON', JSON.stringify(searchSource));
        }
      }
      return doc;
    },
  },
};
