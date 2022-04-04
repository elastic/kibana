/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  DataViewsContract,
  DataView,
  DataViewField,
  DataViewListItem,
} from 'src/plugins/data_views/public';
import { i18n } from '@kbn/i18n';

const defaultIndexPatternListName = i18n.translate(
  'indexPatternManagement.editIndexPattern.list.defaultIndexPatternListName',
  {
    defaultMessage: 'Default',
  }
);

const rollupIndexPatternListName = i18n.translate(
  'indexPatternManagement.editIndexPattern.list.rollupIndexPatternListName',
  {
    defaultMessage: 'Rollup',
  }
);

const isRollup = (indexPatternType: string = '') => {
  return indexPatternType === 'rollup';
};

export async function getIndexPatterns(defaultIndex: string, dataViewsService: DataViewsContract) {
  const existingIndexPatterns = await dataViewsService.getIdsWithTitle(true);
  const indexPatternsListItems = existingIndexPatterns.map((idxPattern) => {
    const { id, title, namespaces, name } = idxPattern;
    const isDefault = defaultIndex === id;
    const tags = getTags(idxPattern, isDefault);

    return {
      id,
      namespaces,
      title,
      name,
      default: isDefault,
      tags,
      // the prepending of 0 at the default pattern takes care of prioritization
      // so the sorting will but the default index on top
      // or on bottom of a the table
      sort: `${isDefault ? '0' : '1'}${title}`,
      getName: () => (name ? name : title),
    };
  });

  return (
    indexPatternsListItems.sort((a, b) => {
      if (a.sort < b.sort) {
        return -1;
      } else if (a.sort > b.sort) {
        return 1;
      } else {
        return 0;
      }
    }) || []
  );
}

export const getTags = (indexPattern: DataViewListItem | DataView, isDefault: boolean) => {
  const tags = [];
  if (isDefault) {
    tags.push({
      key: 'default',
      name: defaultIndexPatternListName,
    });
  }
  if (isRollup(indexPattern.type)) {
    tags.push({
      key: 'rollup',
      name: rollupIndexPatternListName,
    });
  }
  return tags;
};

export const areScriptedFieldsEnabled = (indexPattern: DataViewListItem | DataView) => {
  return !isRollup(indexPattern.type);
};

export const getFieldInfo = (indexPattern: DataViewListItem | DataView, field: DataViewField) => {
  if (!isRollup(indexPattern.type)) {
    return [];
  }

  const allAggs = indexPattern.typeMeta?.aggs;
  const fieldAggs: string[] | undefined =
    allAggs && Object.keys(allAggs).filter((agg) => allAggs[agg][field.name]);

  if (!fieldAggs || !fieldAggs.length) {
    return [];
  }

  return ['Rollup aggregations:'].concat(
    fieldAggs.map((aggName) => {
      const agg = allAggs![aggName][field.name];
      switch (aggName) {
        case 'date_histogram':
          return i18n.translate(
            'indexPatternManagement.editIndexPattern.list.dateHistogramSummary',
            {
              defaultMessage: '{aggName} (interval: {interval}, {delay} {time_zone})',
              values: {
                aggName,
                interval: agg.fixed_interval,
                delay: agg.delay
                  ? i18n.translate(
                      'indexPatternManagement.editIndexPattern.list.DateHistogramDelaySummary',
                      {
                        defaultMessage: 'delay: {delay},',
                        values: {
                          delay: agg.delay,
                        },
                      }
                    )
                  : '',
                time_zone: agg.time_zone,
              },
            }
          );
        case 'histogram':
          return i18n.translate('indexPatternManagement.editIndexPattern.list.histogramSummary', {
            defaultMessage: '{aggName} (interval: {interval})',
            values: {
              aggName,
              interval: agg.interval,
            },
          });
        default:
          return aggName;
      }
    })
  );
};
