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

import { cloneDeep, get, omit, has } from 'lodash';

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
  if (searchSource.index) {
    searchSource.indexRefName = 'kibanaSavedObjectMeta.searchSourceJSON.index';
    doc.references.push({
      name: searchSource.indexRefName,
      type: 'index-pattern',
      id: searchSource.index,
    });
    delete searchSource.index;
  }
  if (searchSource.filter) {
    searchSource.filter.forEach((filterRow, i) => {
      if (!filterRow.meta || !filterRow.meta.index) {
        return;
      }
      filterRow.meta.indexRefName = `kibanaSavedObjectMeta.searchSourceJSON.filter[${i}].meta.index`;
      doc.references.push({
        name: filterRow.meta.indexRefName,
        type: 'index-pattern',
        id: filterRow.meta.index,
      });
      delete filterRow.meta.index;
    });
  }
  doc.attributes.kibanaSavedObjectMeta.searchSourceJSON = JSON.stringify(searchSource);
}

export const migrations = {
  'index-pattern': {
    '6.5.0': (doc) => {
      doc.attributes.type = doc.attributes.type || undefined;
      doc.attributes.typeMeta = doc.attributes.typeMeta || undefined;
      return doc;
    }
  },
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

      // Migrate controls
      const visStateJSON = get(doc, 'attributes.visState');
      if (visStateJSON) {
        let visState;
        try {
          visState = JSON.parse(visStateJSON);
        } catch (e) {
          // Let it go, the data is invalid and we'll leave it as is
        }
        if (visState) {
          const controls = get(visState, 'params.controls') || [];
          controls.forEach((control, i) => {
            if (!control.indexPattern) {
              return;
            }
            control.indexPatternRefName = `control_${i}_index_pattern`;
            doc.references.push({
              name: control.indexPatternRefName,
              type: 'index-pattern',
              id: control.indexPattern,
            });
            delete control.indexPattern;
          });
          doc.attributes.visState = JSON.stringify(visState);
        }
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
    },
    '7.1.0': doc => {
      // [TSVB] Migrate percentile-rank aggregation (value -> values)
      const migratePercentileRankAggregation = doc => {
        const visStateJSON = get(doc, 'attributes.visState');
        let visState;

        if (visStateJSON) {
          try {
            visState = JSON.parse(visStateJSON);
          } catch (e) {
            // Let it go, the data is invalid and we'll leave it as is
          }
          if (visState && visState.type === 'metrics') {
            const series = get(visState, 'params.series') || [];

            series.forEach(part => {
              (part.metrics || []).forEach(metric => {
                if (metric.type === 'percentile_rank' && has(metric, 'value')) {
                  metric.values = [metric.value];

                  delete metric.value;
                }
              });
            });
            return {
              ...doc,
              attributes: {
                ...doc.attributes,
                visState: JSON.stringify(visState),
              },
            };
          }
        }
        return doc;
      };

      return migratePercentileRankAggregation(doc);
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
