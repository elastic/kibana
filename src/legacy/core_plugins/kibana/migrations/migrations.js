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

import { cloneDeep, get, omit, has, flow } from 'lodash';
import { migrations730 as dashboardMigrations730 } from '../public/dashboard/migrations';

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

// Migrate date histogram aggregation (remove customInterval)
const migrateDateHistogramAggregation = doc => {
  const visStateJSON = get(doc, 'attributes.visState');
  let visState;

  if (visStateJSON) {
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
    }

    if (visState && visState.aggs) {
      visState.aggs.forEach(agg => {
        if (agg.type === 'date_histogram' && agg.params) {
          if (agg.params.interval === 'custom') {
            agg.params.interval = agg.params.customInterval;
          }
          delete agg.params.customInterval;
        }

        if (
          get(agg, 'params.customBucket.type', null) === 'date_histogram' &&
          agg.params.customBucket.params
        ) {
          if (agg.params.customBucket.params.interval === 'custom') {
            agg.params.customBucket.params.interval = agg.params.customBucket.params.customInterval;
          }
          delete agg.params.customBucket.params.customInterval;
        }
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

function removeDateHistogramTimeZones(doc) {
  const visStateJSON = get(doc, 'attributes.visState');
  if (visStateJSON) {
    let visState;
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
    }
    if (visState && visState.aggs) {
      visState.aggs.forEach(agg => {
        // We're checking always for the existance of agg.params here. This should always exist, but better
        // be safe then sorry during migrations.
        if (agg.type === 'date_histogram' && agg.params) {
          delete agg.params.time_zone;
        }

        if (
          get(agg, 'params.customBucket.type', null) === 'date_histogram' &&
          agg.params.customBucket.params
        ) {
          delete agg.params.customBucket.params.time_zone;
        }
      });
      doc.attributes.visState = JSON.stringify(visState);
    }
  }
  return doc;
}

// migrate gauge verticalSplit to alignment
// https://github.com/elastic/kibana/issues/34636
function migrateGaugeVerticalSplitToAlignment(doc, logger) {
  const visStateJSON = get(doc, 'attributes.visState');

  if (visStateJSON) {
    try {
      const visState = JSON.parse(visStateJSON);
      if (visState && visState.type === 'gauge' && !visState.params.gauge.alignment) {
        visState.params.gauge.alignment = visState.params.gauge.verticalSplit
          ? 'vertical'
          : 'horizontal';
        delete visState.params.gauge.verticalSplit;
        return {
          ...doc,
          attributes: {
            ...doc.attributes,
            visState: JSON.stringify(visState),
          },
        };
      }
    } catch (e) {
      logger.warning(`Exception @ migrateGaugeVerticalSplitToAlignment! ${e}`);
      logger.warning(`Exception @ migrateGaugeVerticalSplitToAlignment! Payload: ${visStateJSON}`);
    }
  }
  return doc;
}
// Migrate filters (string -> { query: string, language: lucene })
/*
  Enabling KQL in TSVB causes problems with savedObject visualizations when these are saved with filters.
  In a visualisation type of saved object, if the visState param is of type metric, the filter is saved as a string that is not interpretted correctly as a lucene query in the visualization itself.
  We need to transform the filter string into an object containing the original string as a query and specify the query language as lucene.
  For Metrics visualizations (param.type === "metric"), filters can be applied to each series object in the series array within the SavedObject.visState.params object.
  Path to the series array is thus:
  attributes.visState.
*/
function transformFilterStringToQueryObject(doc) {
  // Migrate filters
  // If any filters exist and they are a string, we assume it to be lucene and transform the filter into an object accordingly
  const newDoc = cloneDeep(doc);
  const visStateJSON = get(doc, 'attributes.visState');
  if (visStateJSON) {
    let visState;
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // let it go, the data is invalid and we'll leave it as is
    }
    if (visState) {
      const visType = get(visState, 'params.type');
      const tsvbTypes = ['metric', 'markdown', 'top_n', 'gauge', 'table', 'timeseries'];
      if (tsvbTypes.indexOf(visType) === -1) {
        // skip
        return doc;
      }
      // migrate the params fitler
      const params = get(visState, 'params');
      if (params.filter && typeof params.filter === 'string') {
        const paramsFilterObject = {
          query: params.filter,
          language: 'lucene',
        };
        params.filter = paramsFilterObject;
      }

      // migrate the annotations query string:
      const annotations = get(visState, 'params.annotations') || [];
      annotations.forEach(item => {
        if (!item.query_string) {
          // we don't need to transform anything if there isn't a filter at all
          return;
        }
        if (typeof item.query_string === 'string') {
          const itemQueryStringObject = {
            query: item.query_string,
            language: 'lucene',
          };
          item.query_string = itemQueryStringObject;
        }
      });
      // migrate the series filters
      const series = get(visState, 'params.series') || [];
      series.forEach(item => {
        if (!item.filter) {
          // we don't need to transform anything if there isn't a filter at all
          return;
        }
        // series item filter
        if (typeof item.filter === 'string') {
          const itemfilterObject = {
            query: item.filter,
            language: 'lucene',
          };
          item.filter = itemfilterObject;
        }
        // series item split filters filter
        if (item.split_filters) {
          const splitFilters = get(item, 'split_filters') || [];
          splitFilters.forEach(filter => {
            if (!filter.filter) {
              // we don't need to transform anything if there isn't a filter at all
              return;
            }
            if (typeof filter.filter === 'string') {
              const filterfilterObject = {
                query: filter.filter,
                language: 'lucene',
              };
              filter.filter = filterfilterObject;
            }
          });
        }
      });
      newDoc.attributes.visState = JSON.stringify(visState);
    }
  }
  return newDoc;
}
function transformSplitFiltersStringToQueryObject(doc) {
  // Migrate split_filters in TSVB objects that weren't migrated in 7.3
  // If any filters exist and they are a string, we assume them to be lucene syntax and transform the filter into an object accordingly
  const newDoc = cloneDeep(doc);
  const visStateJSON = get(doc, 'attributes.visState');
  if (visStateJSON) {
    let visState;
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // let it go, the data is invalid and we'll leave it as is
    }
    if (visState) {
      const visType = get(visState, 'params.type');
      const tsvbTypes = ['metric', 'markdown', 'top_n', 'gauge', 'table', 'timeseries'];
      if (tsvbTypes.indexOf(visType) === -1) {
        // skip
        return doc;
      }
      // migrate the series split_filter filters
      const series = get(visState, 'params.series') || [];
      series.forEach(item => {
        // series item split filters filter
        if (item.split_filters) {
          const splitFilters = get(item, 'split_filters') || [];
          if (splitFilters.length > 0) {
            // only transform split_filter filters if we have filters
            splitFilters.forEach(filter => {
              if (typeof filter.filter === 'string') {
                const filterfilterObject = {
                  query: filter.filter,
                  language: 'lucene',
                };
                filter.filter = filterfilterObject;
              }
            });
          }
        }
      });
      newDoc.attributes.visState = JSON.stringify(visState);
    }
  }
  return newDoc;
}

function migrateFiltersAggQuery(doc) {
  const visStateJSON = get(doc, 'attributes.visState');

  if (visStateJSON) {
    try {
      const visState = JSON.parse(visStateJSON);
      if (visState && visState.aggs) {
        visState.aggs.forEach(agg => {
          if (agg.type !== 'filters') return;

          agg.params.filters.forEach(filter => {
            if (filter.input.language) return filter;
            filter.input.language = 'lucene';
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
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
    }
  }
  return doc;
}

function replaceMovAvgToMovFn(doc, logger) {
  const visStateJSON = get(doc, 'attributes.visState');
  let visState;

  if (visStateJSON) {
    try {
      visState = JSON.parse(visStateJSON);

      if (visState && visState.type === 'metrics') {
        const series = get(visState, 'params.series', []);

        series.forEach(part => {
          if (part.metrics && Array.isArray(part.metrics)) {
            part.metrics.forEach(metric => {
              if (metric.type === 'moving_average') {
                metric.model_type = metric.model;
                metric.alpha = get(metric, 'settings.alpha', 0.3);
                metric.beta = get(metric, 'settings.beta', 0.1);
                metric.gamma = get(metric, 'settings.gamma', 0.3);
                metric.period = get(metric, 'settings.period', 1);
                metric.multiplicative = get(metric, 'settings.type') === 'mult';

                delete metric.minimize;
                delete metric.model;
                delete metric.settings;
                delete metric.predict;
              }
            });
          }
        });

        return {
          ...doc,
          attributes: {
            ...doc.attributes,
            visState: JSON.stringify(visState),
          },
        };
      }
    } catch (e) {
      logger.warning(`Exception @ replaceMovAvgToMovFn! ${e}`);
      logger.warning(`Exception @ replaceMovAvgToMovFn! Payload: ${visStateJSON}`);
    }
  }

  return doc;
}

function migrateSearchSortToNestedArray(doc) {
  const sort = get(doc, 'attributes.sort');
  if (!sort) return doc;

  // Don't do anything if we already have a two dimensional array
  if (Array.isArray(sort) && sort.length > 0 && Array.isArray(sort[0])) {
    return doc;
  }

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      sort: [doc.attributes.sort],
    },
  };
}

function migrateFiltersAggQueryStringQueries(doc) {
  const visStateJSON = get(doc, 'attributes.visState');

  if (visStateJSON) {
    try {
      const visState = JSON.parse(visStateJSON);
      if (visState && visState.aggs) {
        visState.aggs.forEach(agg => {
          if (agg.type !== 'filters') return doc;

          agg.params.filters.forEach(filter => {
            if (filter.input.query.query_string) {
              filter.input.query = filter.input.query.query_string.query;
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
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
    }
  }
  return doc;
}

function migrateSubTypeAndParentFieldProperties(doc) {
  if (!doc.attributes.fields) return doc;

  const fieldsString = doc.attributes.fields;
  const fields = JSON.parse(fieldsString);
  const migratedFields = fields.map(field => {
    if (field.subType === 'multi') {
      return {
        ...omit(field, 'parent'),
        subType: { multi: { parent: field.parent } },
      };
    }

    return field;
  });

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      fields: JSON.stringify(migratedFields),
    },
  };
}

const executeMigrations720 = flow(
  migratePercentileRankAggregation,
  migrateDateHistogramAggregation
);
const executeMigrations730 = flow(
  migrateGaugeVerticalSplitToAlignment,
  transformFilterStringToQueryObject,
  migrateFiltersAggQuery,
  replaceMovAvgToMovFn
);

const executeVisualizationMigrations731 = flow(migrateFiltersAggQueryStringQueries);

const executeSearchMigrations740 = flow(migrateSearchSortToNestedArray);

const executeMigrations742 = flow(transformSplitFiltersStringToQueryObject);

export const migrations = {
  'index-pattern': {
    '6.5.0': doc => {
      doc.attributes.type = doc.attributes.type || undefined;
      doc.attributes.typeMeta = doc.attributes.typeMeta || undefined;
      return doc;
    },
    '7.6.0': flow(migrateSubTypeAndParentFieldProperties),
  },
  visualization: {
    /**
     * We need to have this migration twice, once with a version prior to 7.0.0 once with a version
     * after it. The reason for that is, that this migration has been introduced once 7.0.0 was already
     * released. Thus a user who already had 7.0.0 installed already got the 7.0.0 migrations below running,
     * so we need a version higher than that. But this fix was backported to the 6.7 release, meaning if we
     * would only have the 7.0.1 migration in here a user on the 6.7 release will migrate their saved objects
     * to the 7.0.1 state, and thus when updating their Kibana to 7.0, will never run the 7.0.0 migrations introduced
     * in that version. So we apply this twice, once with 6.7.2 and once with 7.0.1 while the backport to 6.7
     * only contained the 6.7.2 migration and not the 7.0.1 migration.
     */
    '6.7.2': removeDateHistogramTimeZones,
    '7.0.0': doc => {
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
      }
      delete doc.attributes.savedSearchId;

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
        throw new Error(
          `Failure attempting to migrate saved object '${doc.attributes.title}' - ${e}`
        );
      }
    },
    '7.0.1': removeDateHistogramTimeZones,
    '7.2.0': doc => executeMigrations720(doc),
    '7.3.0': executeMigrations730,
    '7.3.1': executeVisualizationMigrations731,
    // migrate split_filters that were not migrated in 7.3.0 (transformFilterStringToQueryObject).
    '7.4.2': executeMigrations742,
  },
  dashboard: {
    '7.0.0': doc => {
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
    '7.3.0': dashboardMigrations730,
  },
  search: {
    '7.0.0': doc => {
      // Set new "references" attribute
      doc.references = doc.references || [];
      // Migrate index pattern
      migrateIndexPattern(doc);
      return doc;
    },
    '7.4.0': executeSearchMigrations740,
  },
};
