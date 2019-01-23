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

function migrateIndexPattern(type, doc) {
  const searchSourceJSON = get(doc, 'attributes.kibanaSavedObjectMeta.searchSourceJSON');
  if (
    typeof searchSourceJSON !== 'string' &&
    searchSourceJSON !== undefined &&
    searchSourceJSON !== null
  ) {
    throw new Error(`searchSourceJSON is not a string on ${type} "${doc.id}"`);
  }
  if (searchSourceJSON) {
    let searchSource;
    try {
      searchSource = JSON.parse(searchSourceJSON);
    } catch (e) {
      throw new Error(
        `Failed to parse searchSourceJSON: "${searchSourceJSON}" because "${
          e.message
        }" on ${type} "${doc.id}"`
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
}

export default {
  visualization: {
    '7.0.0': (doc) => {
      const savedSearchId = get(doc, 'attributes.savedSearchId');
      // Set new "references" attribute
      doc.references = doc.references || [];
      // Migrate index pattern
      migrateIndexPattern('visualization', doc);
      // Migrate saved search
      if (savedSearchId) {
        doc.references.push({
          type: 'search',
          name: 'search_0',
          id: savedSearchId,
        });
        doc.attributes.savedSearchId = 'search_0';
      }
      return doc;
    },
  },
  dashboard: {
    '7.0.0': (doc) => {
      // Set new "references" attribute
      doc.references = doc.references || [];
      // Migrate index pattern
      migrateIndexPattern('dashboard', doc);
      // Migrate panels
      const panelsJSON = get(doc, 'attributes.panelsJSON');
      if (typeof panelsJSON !== 'string') {
        throw new Error(`panelsJSON is ${panelsJSON ? 'not a string' : 'missing'} on dashboard "${doc.id}"`);
      }
      let panels;
      try {
        panels = JSON.parse(panelsJSON);
      } catch (e) {
        throw new Error(`Failed to parse panelsJSON: "${panelsJSON}" because "${e.message}" on dashboard "${doc.id}"`);
      }
      panels.forEach((panel, i) => {
        panel.panelRef = `panel_${i}`;
        if (!panel.type) {
          throw new Error(`"type" attribute is missing from panel "${i}" on dashboard "${doc.id}"`);
        }
        if (!panel.id) {
          throw new Error(`"id" attribute is missing from panel "${i}" on dashboard "${doc.id}"`);
        }
        doc.references.push({
          name: `panel_${i}`,
          type: panel.type,
          id: panel.id
        });
        delete panel.type;
        delete panel.id;
      });
      doc.attributes.panelsJSON = JSON.stringify(panels);
      return doc;
    },
  },
  search: {
    '7.0.0': (doc) => {
      doc.references = doc.references || [];
      migrateIndexPattern('search', doc);
      return doc;
    },
  },
};
