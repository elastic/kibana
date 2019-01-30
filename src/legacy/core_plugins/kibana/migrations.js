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

import { cloneDeep, get, omit } from 'lodash';

function migrateIndexPattern(doc) {
  const searchSourceJSON = get(doc, 'attributes.kibanaSavedObjectMeta.searchSourceJSON');
  if (typeof searchSourceJSON !== 'string') {
    return;
  }
  let searchSource;
  try {
    searchSource = JSON.parse(searchSourceJSON);
  } catch (e) {
    // Let it go, the data is invalid and we'll leave it as is
    return;
  }
  if (!searchSource.index) {
    return;
  }
  doc.references.push({
    name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
    type: 'index-pattern',
    id: searchSource.index,
  });
  searchSource.indexRefName = 'kibanaSavedObjectMeta.searchSourceJSON.index';
  delete searchSource.index;
  doc.attributes.kibanaSavedObjectMeta.searchSourceJSON = JSON.stringify(searchSource);
}

export const migrations = {
  visualization: {
    '7.0.0': (doc) => {
      // Set new "references" attribute
      doc.references = doc.references || [];

      // Migrate index pattern
      migrateIndexPattern(doc);

      // Migrate saved search
      const savedSearchId = get(doc, 'attributes.savedSearchId');
      if (savedSearchId) {
        doc.references.push({
          type: 'search',
          name: 'search_0',
          id: savedSearchId,
        });
        doc.attributes.savedSearchRefName = 'search_0';
        delete doc.attributes.savedSearchId;
      }

      // Migrate table splits
      try {
        const visState = JSON.parse(doc.attributes.visState);
        if (get(visState, 'type') !== 'table') {
          return doc; // do nothing; we only want to touch tables
        }

        let splitCount = 0;
        visState.aggs = visState.aggs.map(agg => {
          if (agg.schema !== 'split') {
            return agg;
          }

          splitCount++;
          if (splitCount === 1) {
            return agg; // leave the first split agg unchanged
          }
          agg.schema = 'bucket';
          // the `row` param is exclusively used by split aggs, so we remove it
          agg.params = omit(agg.params, ['row']);
          return agg;
        });

        if (splitCount <= 1) {
          return doc; // do nothing; we only want to touch tables with multiple split aggs
        }

        const newDoc = cloneDeep(doc);
        newDoc.attributes.visState = JSON.stringify(visState);
        return newDoc;
      } catch (e) {
        throw new Error(`Failure attempting to migrate saved object '${doc.attributes.title}' - ${e}`);
      }
    }
  },
  dashboard: {
    '7.0.0': (doc) => {
      // Set new "references" attribute
      doc.references = doc.references || [];
      // Migrate index pattern
      migrateIndexPattern(doc);
      // Migrate panels
      const panelsJSON = get(doc, 'attributes.panelsJSON');
      if (typeof panelsJSON !== 'string') {
        return doc;
      }
      let panels;
      try {
        panels = JSON.parse(panelsJSON);
      } catch (e) {
        // Let it go, the data is invalid and we'll leave it as is
        return doc;
      }
      if (!Array.isArray(panels)) {
        return doc;
      }
      panels.forEach((panel, i) => {
        if (!panel.type || !panel.id) {
          return;
        }
        panel.panelRefName = `panel_${i}`;
        doc.references.push({
          name: `panel_${i}`,
          type: panel.type,
          id: panel.id,
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
      // Set new "references" attribute
      doc.references = doc.references || [];
      // Migrate index pattern
      migrateIndexPattern(doc);
      return doc;
    },
  },
};
