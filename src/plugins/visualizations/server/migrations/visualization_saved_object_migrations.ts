/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep, get, omit, has, flow, forOwn, mapValues } from 'lodash';
import type { SavedObjectMigrationFn, SavedObjectMigrationMap } from '@kbn/core/server';
import { mergeSavedObjectMigrationMaps } from '@kbn/core/server';
import { MigrateFunctionsObject, MigrateFunction } from '@kbn/kibana-utils-plugin/common';

import { DEFAULT_QUERY_LANGUAGE, SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import {
  commonAddSupportOfDualIndexSelectionModeInTSVB,
  commonHideTSVBLastValueIndicator,
  commonRemoveDefaultIndexPatternAndTimeFieldFromTSVBModel,
  commonMigrateVislibPie,
  commonAddEmptyValueColorRule,
  commonMigrateTagCloud,
  commonAddDropLastBucketIntoTSVBModel,
  commonAddDropLastBucketIntoTSVBModel714Above,
  commonRemoveMarkdownLessFromTSVB,
  commonUpdatePieVisApi,
} from './visualization_common_migrations';
import { VisualizationSavedObjectAttributes } from '../../common';

const migrateIndexPattern: SavedObjectMigrationFn<any, any> = (doc) => {
  const searchSourceJSON = get(doc, 'attributes.kibanaSavedObjectMeta.searchSourceJSON');
  if (typeof searchSourceJSON !== 'string') {
    return doc;
  }
  let searchSource;
  try {
    searchSource = JSON.parse(searchSourceJSON);
  } catch (e) {
    // Let it go, the data is invalid and we'll leave it as is
    return doc;
  }

  if (searchSource.index && Array.isArray(doc.references)) {
    searchSource.indexRefName = 'kibanaSavedObjectMeta.searchSourceJSON.index';
    doc.references.push({
      name: searchSource.indexRefName,
      type: DATA_VIEW_SAVED_OBJECT_TYPE,
      id: searchSource.index,
    });
    delete searchSource.index;
  }
  if (searchSource.filter) {
    searchSource.filter.forEach((filterRow: any, i: number) => {
      if (!filterRow.meta || !filterRow.meta.index || !Array.isArray(doc.references)) {
        return;
      }
      filterRow.meta.indexRefName = `kibanaSavedObjectMeta.searchSourceJSON.filter[${i}].meta.index`;
      doc.references.push({
        name: filterRow.meta.indexRefName,
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        id: filterRow.meta.index,
      });
      delete filterRow.meta.index;
    });
  }

  doc.attributes.kibanaSavedObjectMeta.searchSourceJSON = JSON.stringify(searchSource);

  return doc;
};

// [TSVB] Migrate percentile-rank aggregation (value -> values)
const migratePercentileRankAggregation: SavedObjectMigrationFn<any, any> = (doc) => {
  const visStateJSON = get(doc, 'attributes.visState');
  let visState;

  if (visStateJSON) {
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
    }
    if (visState && visState.type === 'metrics') {
      const series: any[] = get(visState, 'params.series') || [];

      series.forEach((part) => {
        (part.metrics || []).forEach((metric: any) => {
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

// [TSVB] Replace string query with object
const migrateFilterRatioQuery: SavedObjectMigrationFn<any, any> = (doc) => {
  const visStateJSON = get(doc, 'attributes.visState');
  let visState;

  if (visStateJSON) {
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
    }
    if (visState && visState.type === 'metrics') {
      const series: any[] = get(visState, 'params.series') || [];

      series.forEach((part) => {
        (part.metrics || []).forEach((metric: any) => {
          if (metric.type === 'filter_ratio') {
            if (typeof metric.numerator === 'string') {
              metric.numerator = { query: metric.numerator, language: 'lucene' };
            }
            if (typeof metric.denominator === 'string') {
              metric.denominator = { query: metric.denominator, language: 'lucene' };
            }
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

// [TSVB] Remove stale opperator key
const migrateOperatorKeyTypo: SavedObjectMigrationFn<any, any> = (doc) => {
  const visStateJSON = get(doc, 'attributes.visState');
  let visState;

  if (visStateJSON) {
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
    }
    if (visState && visState.type === 'metrics') {
      const gaugeColorRules: any[] = get(visState, 'params.gauge_color_rules') || [];

      gaugeColorRules.forEach((colorRule) => {
        if (colorRule.opperator) {
          delete colorRule.opperator;
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

/**
 * Moving setting wether to do a row or column split to vis.params
 *
 * @see https://github.com/elastic/kibana/pull/58462/files#diff-ae69fe15b20a5099d038e9bbe2ed3849
 **/
const migrateSplitByChartRow: SavedObjectMigrationFn<any, any> = (doc) => {
  const visStateJSON = get(doc, 'attributes.visState');
  let visState: any;

  if (visStateJSON) {
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
    }

    if (visState && visState.aggs && visState.params) {
      let row: boolean | undefined;

      visState.aggs.forEach((agg: any) => {
        if (agg.type === 'terms' && agg.schema === 'split' && 'row' in agg.params) {
          row = agg.params.row;

          delete agg.params.row;
        }
      });

      if (row !== undefined) {
        visState.params.row = row;
      }

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
const migrateDateHistogramAggregation: SavedObjectMigrationFn<any, any> = (doc) => {
  const visStateJSON = get(doc, 'attributes.visState');
  let visState;

  if (visStateJSON) {
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
    }

    if (visState && visState.aggs) {
      visState.aggs.forEach((agg: any) => {
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

// Migrate schemas inside aggregation (replace 'schema' object to name of the schema)
const migrateSchema: SavedObjectMigrationFn<any, any> = (doc) => {
  const visStateJSON = get(doc, 'attributes.visState');
  let visState;

  if (visStateJSON) {
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
    }

    function replaceSchema(agg: any) {
      forOwn(agg, (value: any, key: string) => {
        if (typeof value === 'object') {
          if (key === 'schema') {
            agg[key] = value.name;
          } else {
            replaceSchema(value);
          }
        }
      });
    }

    if (visState && visState.aggs) {
      for (const agg of visState.aggs) {
        if (typeof agg === 'object') {
          replaceSchema(agg);
        }
      }
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

const removeDateHistogramTimeZones: SavedObjectMigrationFn<any, any> = (doc) => {
  const visStateJSON = get(doc, 'attributes.visState');
  if (visStateJSON) {
    let visState;
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
    }
    if (visState && visState.aggs) {
      visState.aggs.forEach((agg: any) => {
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
};

// migrate gauge verticalSplit to alignment
// https://github.com/elastic/kibana/issues/34636
const migrateGaugeVerticalSplitToAlignment: SavedObjectMigrationFn<any, any> = (doc, logger) => {
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
      logger.log.warn(`Exception @ migrateGaugeVerticalSplitToAlignment! ${e}`);
      logger.log.warn(`Exception @ migrateGaugeVerticalSplitToAlignment! Payload: ${visStateJSON}`);
    }
  }
  return doc;
};
// Migrate filters (string -> { query: string, language: lucene })
/*
  Enabling KQL in TSVB causes problems with savedObject visualizations when these are saved with filters.
  In a visualisation type of saved object, if the visState param is of type metric, the filter is saved as a string that is not interpretted correctly as a lucene query in the visualization itself.
  We need to transform the filter string into an object containing the original string as a query and specify the query language as lucene.
  For Metrics visualizations (param.type === "metric"), filters can be applied to each series object in the series array within the SavedObject.visState.params object.
  Path to the series array is thus:
  attributes.visState.
*/
const transformFilterStringToQueryObject: SavedObjectMigrationFn<any, any> = (doc, logger) => {
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
      const params: any = get(visState, 'params');
      if (params.filter && typeof params.filter === 'string') {
        const paramsFilterObject = {
          query: params.filter,
          language: 'lucene',
        };
        params.filter = paramsFilterObject;
      }

      // migrate the annotations query string:
      const annotations: any[] = get(visState, 'params.annotations') || [];
      annotations.forEach((item) => {
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
      const series: any[] = get(visState, 'params.series') || [];

      series.forEach((item) => {
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
          const splitFilters: any[] = get(item, 'split_filters') || [];
          splitFilters.forEach((filter) => {
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
};

const transformSplitFiltersStringToQueryObject: SavedObjectMigrationFn<any, any> = (doc) => {
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
      const series: any[] = get(visState, 'params.series') || [];
      series.forEach((item) => {
        // series item split filters filter
        if (item.split_filters) {
          const splitFilters: any[] = get(item, 'split_filters') || [];
          if (splitFilters.length > 0) {
            // only transform split_filter filters if we have filters
            splitFilters.forEach((filter) => {
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
};

const migrateFiltersAggQuery: SavedObjectMigrationFn<any, any> = (doc) => {
  const visStateJSON = get(doc, 'attributes.visState');

  if (visStateJSON) {
    try {
      const visState = JSON.parse(visStateJSON);

      if (visState && visState.aggs) {
        visState.aggs.forEach((agg: any) => {
          if (agg.type !== 'filters') return;

          agg.params.filters.forEach((filter: any) => {
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
};

const replaceMovAvgToMovFn: SavedObjectMigrationFn<any, any> = (doc, logger) => {
  const visStateJSON = get(doc, 'attributes.visState');
  let visState;

  if (visStateJSON) {
    try {
      visState = JSON.parse(visStateJSON);

      if (visState && visState.type === 'metrics') {
        const series: any[] = get(visState, 'params.series', []);

        series.forEach((part) => {
          if (part.metrics && Array.isArray(part.metrics)) {
            part.metrics.forEach((metric: any) => {
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
      logger.log.warn(`Exception @ replaceMovAvgToMovFn! ${e}`);
      logger.log.warn(`Exception @ replaceMovAvgToMovFn! Payload: ${visStateJSON}`);
    }
  }

  return doc;
};

const migrateFiltersAggQueryStringQueries: SavedObjectMigrationFn<any, any> = (doc, logger) => {
  const visStateJSON = get(doc, 'attributes.visState');

  if (visStateJSON) {
    try {
      const visState = JSON.parse(visStateJSON);

      if (visState && visState.aggs) {
        visState.aggs.forEach((agg: any) => {
          if (agg.type !== 'filters') return doc;

          agg.params.filters.forEach((filter: any) => {
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
};

const addDocReferences: SavedObjectMigrationFn<any, any> = (doc) => ({
  ...doc,
  references: doc.references || [],
});

const migrateSavedSearch: SavedObjectMigrationFn<any, any> = (doc) => {
  const savedSearchId = get(doc, 'attributes.savedSearchId');

  if (savedSearchId && doc.references) {
    doc.references.push({
      type: 'search',
      name: 'search_0',
      id: savedSearchId,
    });
    doc.attributes.savedSearchRefName = 'search_0';
  }

  delete doc.attributes.savedSearchId;

  return doc;
};

const migrateControls: SavedObjectMigrationFn<any, any> = (doc) => {
  const visStateJSON = get(doc, 'attributes.visState');

  if (visStateJSON) {
    let visState;
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
    }
    if (visState) {
      const controls: any[] = get(visState, 'params.controls') || [];
      controls.forEach((control, i) => {
        if (!control.indexPattern || !doc.references) {
          return;
        }
        control.indexPatternRefName = `control_${i}_index_pattern`;
        doc.references.push({
          name: control.indexPatternRefName,
          type: DATA_VIEW_SAVED_OBJECT_TYPE,
          id: control.indexPattern,
        });
        delete control.indexPattern;
      });
      doc.attributes.visState = JSON.stringify(visState);
    }
  }

  return doc;
};

const migrateTableSplits: SavedObjectMigrationFn<any, any> = (doc) => {
  try {
    const visState = JSON.parse(doc.attributes.visState);
    if (get(visState, 'type') !== 'table') {
      return doc; // do nothing; we only want to touch tables
    }

    let splitCount = 0;
    visState.aggs = visState.aggs.map((agg: any) => {
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
};

/**
 * This migration script is related to:
 *   @link https://github.com/elastic/kibana/pull/62194
 *   @link https://github.com/elastic/kibana/pull/14644
 * This is only a problem when you import an object from 5.x into 6.x but to be sure that all saved objects migrated we should execute it twice in 6.7.2 and 7.9.3
 */
const migrateMatchAllQuery: SavedObjectMigrationFn<any, any> = (doc) => {
  const searchSourceJSON = get(doc, 'attributes.kibanaSavedObjectMeta.searchSourceJSON');

  if (searchSourceJSON) {
    let searchSource: any;

    try {
      searchSource = JSON.parse(searchSourceJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
      return doc;
    }

    if (searchSource.query?.match_all) {
      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              ...searchSource,
              query: {
                query: '',
                language: DEFAULT_QUERY_LANGUAGE,
              },
            }),
          },
        },
      };
    }
  }
  return doc;
};

// [TSVB] Default color palette is changing, keep the default for older viz
const migrateTsvbDefaultColorPalettes: SavedObjectMigrationFn<any, any> = (doc) => {
  const visStateJSON = get(doc, 'attributes.visState');
  let visState;

  if (visStateJSON) {
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
    }
    if (visState && visState.type === 'metrics') {
      const series: any[] = get(visState, 'params.series') || [];

      series.forEach((part) => {
        // The default value was not saved before
        if (!part.split_color_mode) {
          part.split_color_mode = 'gradient';
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

// [TSVB] Remove serialized search source as it's not used in TSVB visualizations
const removeTSVBSearchSource: SavedObjectMigrationFn<any, any> = (doc) => {
  const visStateJSON = get(doc, 'attributes.visState');
  let visState;

  const searchSourceJSON = get(doc, 'attributes.kibanaSavedObjectMeta.searchSourceJSON');

  if (visStateJSON) {
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
    }
    if (visState && visState.type === 'metrics' && searchSourceJSON !== '{}') {
      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          kibanaSavedObjectMeta: {
            ...get(doc, 'attributes.kibanaSavedObjectMeta'),
            searchSourceJSON: '{}',
          },
        },
      };
    }
  }
  return doc;
};

const addSupportOfDualIndexSelectionModeInTSVB: SavedObjectMigrationFn<any, any> = (doc) => {
  const visStateJSON = get(doc, 'attributes.visState');
  let visState;

  if (visStateJSON) {
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
      return doc;
    }
    const newVisState = commonAddSupportOfDualIndexSelectionModeInTSVB(visState);
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        visState: JSON.stringify(newVisState),
      },
    };
  }
  return doc;
};

// [Data table visualization] Enable toolbar by default
const enableDataTableVisToolbar: SavedObjectMigrationFn<any, any> = (doc) => {
  let visState;

  try {
    visState = JSON.parse(doc.attributes.visState);
  } catch (e) {
    // Let it go, the data is invalid and we'll leave it as is
  }

  if (visState?.type === 'table') {
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        visState: JSON.stringify({
          ...visState,
          params: {
            ...visState.params,
            showToolbar: true,
          },
        }),
      },
    };
  }

  return doc;
};

/**
 * Decorate axes with default label filter value
 */
const decorateAxes = <T extends { labels: { filter?: boolean } }>(
  axes: T[],
  fallback: boolean
): T[] =>
  axes.map((axis) => ({
    ...axis,
    labels: {
      ...axis.labels,
      filter: axis.labels.filter ?? fallback,
    },
  }));

/**
 * Defaults circlesRadius to 1 if it is not configured
 */
const addCirclesRadius = <T extends { circlesRadius: number }>(axes: T[]): T[] =>
  axes.map((axis) => {
    const hasCircleRadiusAttribute = Number.isFinite(axis?.circlesRadius);
    return {
      ...axis,
      ...(!hasCircleRadiusAttribute && {
        circlesRadius: 1,
      }),
    };
  });

// Inlined from vis_type_xy
const CHART_TYPE_AREA = 'area';
const CHART_TYPE_LINE = 'line';
const CHART_TYPE_HISTOGRAM = 'histogram';

/**
 * Migrate vislib bar, line and area charts to use new vis_type_xy plugin
 */
const migrateVislibAreaLineBarTypes: SavedObjectMigrationFn<any, any> = (doc) => {
  const visStateJSON = get(doc, 'attributes.visState');
  let visState;

  if (visStateJSON) {
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
    }
    if (
      visState &&
      [CHART_TYPE_AREA, CHART_TYPE_LINE, CHART_TYPE_HISTOGRAM].includes(visState?.params?.type)
    ) {
      const isHorizontalBar = visState.type === 'horizontal_bar';
      const isLineOrArea =
        visState?.params?.type === CHART_TYPE_AREA || visState?.params?.type === CHART_TYPE_LINE;
      const hasPalette = visState?.params?.palette;
      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          visState: JSON.stringify({
            ...visState,
            params: {
              ...visState.params,
              ...(!hasPalette && {
                palette: {
                  type: 'palette',
                  name: 'kibana_palette',
                },
              }),
              categoryAxes:
                visState.params.categoryAxes &&
                decorateAxes(visState.params.categoryAxes, !isHorizontalBar),
              valueAxes:
                visState.params.valueAxes &&
                decorateAxes(visState.params.valueAxes, isHorizontalBar),
              seriesParams:
                visState.params.seriesParams && addCirclesRadius(visState.params.seriesParams),
              isVislibVis: true,
              detailedTooltip: true,
              ...(isLineOrArea && {
                fittingFunction: 'linear',
              }),
            },
          }),
        },
      };
    }
  }
  return doc;
};

/**
 * [TSVB] Hide Last value indicator by default for all TSVB types except timeseries
 */
const hideTSVBLastValueIndicator: SavedObjectMigrationFn<any, any> = (doc) => {
  try {
    const visState = JSON.parse(doc.attributes.visState);
    const newVisState = commonHideTSVBLastValueIndicator(visState);
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        visState: JSON.stringify(newVisState),
      },
    };
  } catch (e) {
    // Let it go, the data is invalid and we'll leave it as is
  }
  return doc;
};

const addDropLastBucketIntoTSVBModel: SavedObjectMigrationFn<any, any> = (doc) => {
  try {
    const visState = JSON.parse(doc.attributes.visState);
    const newVisState = commonAddDropLastBucketIntoTSVBModel(visState);
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        visState: JSON.stringify(newVisState),
      },
    };
  } catch (e) {
    // Let it go, the data is invalid and we'll leave it as is
  }
  return doc;
};

const addDropLastBucketIntoTSVBModel714Above: SavedObjectMigrationFn<any, any> = (doc) => {
  try {
    const visState = JSON.parse(doc.attributes.visState);
    const newVisState = commonAddDropLastBucketIntoTSVBModel714Above(visState);
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        visState: JSON.stringify(newVisState),
      },
    };
  } catch (e) {
    // Let it go, the data is invalid and we'll leave it as is
  }
  return doc;
};

const removeDefaultIndexPatternAndTimeFieldFromTSVBModel: SavedObjectMigrationFn<any, any> = (
  doc
) => {
  const visStateJSON = get(doc, 'attributes.visState');
  let visState;

  if (visStateJSON) {
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
      return doc;
    }
  }
  const newVisState = commonRemoveDefaultIndexPatternAndTimeFieldFromTSVBModel(visState);
  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      visState: JSON.stringify(newVisState),
    },
  };
};

const addEmptyValueColorRule: SavedObjectMigrationFn<any, any> = (doc) => {
  const visStateJSON = get(doc, 'attributes.visState');
  let visState;

  if (visStateJSON) {
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
    }
    const newVisState = commonAddEmptyValueColorRule(visState);

    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        visState: JSON.stringify(newVisState),
      },
    };
  }
  return doc;
};

// [Pie Chart] Migrate vislib pie chart to use the new plugin vis_type_pie
const migrateVislibPie: SavedObjectMigrationFn<any, any> = (doc) => {
  const visStateJSON = get(doc, 'attributes.visState');
  let visState;

  if (visStateJSON) {
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
    }
    const newVisState = commonMigrateVislibPie(visState);
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        visState: JSON.stringify(newVisState),
      },
    };
  }
  return doc;
};

// [Tagcloud] Migrate to the new palette service
const migrateTagCloud: SavedObjectMigrationFn<any, any> = (doc) => {
  const visStateJSON = get(doc, 'attributes.visState');
  let visState;

  if (visStateJSON) {
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
    }
    const newVisState = commonMigrateTagCloud(visState);
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        visState: JSON.stringify(newVisState),
      },
    };
  }
  return doc;
};

export const replaceIndexPatternReference: SavedObjectMigrationFn<any, any> = (doc) => ({
  ...doc,
  references: Array.isArray(doc.references)
    ? doc.references.map((reference) => {
        if (reference.type === 'index_pattern') {
          reference.type = DATA_VIEW_SAVED_OBJECT_TYPE;
        }
        return reference;
      })
    : doc.references,
});

export const removeMarkdownLessFromTSVB: SavedObjectMigrationFn<any, any> = (doc) => {
  const visStateJSON = get(doc, 'attributes.visState');
  let visState;

  if (visStateJSON) {
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
    }

    const newVisState = commonRemoveMarkdownLessFromTSVB(visState);
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        visState: JSON.stringify(newVisState),
      },
    };
  }
  return doc;
};

export const updatePieVisApi: SavedObjectMigrationFn<any, any> = (doc) => {
  const visStateJSON = get(doc, 'attributes.visState');
  let visState;

  if (visStateJSON) {
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
    }

    const newVisState = commonUpdatePieVisApi(visState);
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        visState: JSON.stringify(newVisState),
      },
    };
  }

  return doc;
};

const visualizationSavedObjectTypeMigrations = {
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
  '6.7.2': flow(migrateMatchAllQuery, removeDateHistogramTimeZones),
  '7.0.0': flow(
    addDocReferences,
    migrateIndexPattern,
    migrateSavedSearch,
    migrateControls,
    migrateTableSplits
  ),
  '7.0.1': flow(removeDateHistogramTimeZones),
  '7.2.0': flow(migratePercentileRankAggregation, migrateDateHistogramAggregation),
  '7.3.0': flow(
    migrateGaugeVerticalSplitToAlignment,
    transformFilterStringToQueryObject,
    migrateFiltersAggQuery,
    replaceMovAvgToMovFn
  ),
  '7.3.1': flow(migrateFiltersAggQueryStringQueries),
  '7.4.2': flow(transformSplitFiltersStringToQueryObject),
  '7.7.0': flow(migrateOperatorKeyTypo, migrateSplitByChartRow),
  '7.8.0': flow(migrateTsvbDefaultColorPalettes),
  '7.9.3': flow(migrateMatchAllQuery),
  '7.10.0': flow(migrateFilterRatioQuery, removeTSVBSearchSource),
  '7.11.0': flow(enableDataTableVisToolbar),
  '7.12.0': flow(migrateVislibAreaLineBarTypes, migrateSchema),
  '7.13.0': flow(
    addSupportOfDualIndexSelectionModeInTSVB,
    hideTSVBLastValueIndicator,
    removeDefaultIndexPatternAndTimeFieldFromTSVBModel
  ),
  '7.13.1': flow(
    // duplicate these migrations in case a broken by value panel is added to the library
    addSupportOfDualIndexSelectionModeInTSVB,
    hideTSVBLastValueIndicator,
    removeDefaultIndexPatternAndTimeFieldFromTSVBModel
  ),
  '7.14.0': flow(
    addEmptyValueColorRule,
    migrateVislibPie,
    migrateTagCloud,
    replaceIndexPatternReference,
    addDropLastBucketIntoTSVBModel
  ),
  '7.17.0': flow(addDropLastBucketIntoTSVBModel714Above),
  '8.0.0': flow(removeMarkdownLessFromTSVB),
  '8.1.0': flow(updatePieVisApi),
};

/**
 * This creates a migration map that applies search source migrations to legacy visualization SOs
 */
const getVisualizationSearchSourceMigrations = (
  searchSourceMigrations: MigrateFunctionsObject
): MigrateFunctionsObject =>
  mapValues<MigrateFunctionsObject, MigrateFunction>(
    searchSourceMigrations,
    (migrate: MigrateFunction<SerializedSearchSourceFields>): MigrateFunction =>
      (state) => {
        const _state = state as { attributes: VisualizationSavedObjectAttributes };

        const parsedSearchSourceJSON = JSON.parse(
          _state.attributes.kibanaSavedObjectMeta.searchSourceJSON
        );

        const isNotSerializedSearchSource =
          typeof parsedSearchSourceJSON !== 'object' ||
          parsedSearchSourceJSON === null ||
          Array.isArray(parsedSearchSourceJSON);
        if (isNotSerializedSearchSource) return _state;

        return {
          ..._state,
          attributes: {
            ..._state.attributes,
            kibanaSavedObjectMeta: {
              ..._state.attributes.kibanaSavedObjectMeta,
              searchSourceJSON: JSON.stringify(migrate(parsedSearchSourceJSON)),
            },
          },
        };
      }
  );

export const getAllMigrations = (
  searchSourceMigrations: MigrateFunctionsObject
): SavedObjectMigrationMap =>
  mergeSavedObjectMigrationMaps(
    visualizationSavedObjectTypeMigrations,
    getVisualizationSearchSourceMigrations(searchSourceMigrations) as SavedObjectMigrationMap
  );
