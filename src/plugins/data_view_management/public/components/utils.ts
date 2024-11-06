/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DataViewsContract,
  DataView,
  DataViewField,
  DataViewListItem,
  DataViewType,
} from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { ROLLUP_DEPRECATION_BADGE_LABEL } from '@kbn/rollup';

const defaultIndexPatternListName = i18n.translate(
  'indexPatternManagement.editIndexPattern.list.defaultIndexPatternListName',
  {
    defaultMessage: 'Default',
  }
);

export const isRollup = (indexPatternType: string = '') => {
  return indexPatternType === DataViewType.ROLLUP;
};

export async function getIndexPatterns(defaultIndex: string, dataViewsService: DataViewsContract) {
  const existingIndexPatterns = await dataViewsService.getIdsWithTitle(true);
  const indexPatternsListItems = existingIndexPatterns.map((idxPattern) => {
    const { id, title, namespaces, name } = idxPattern;
    const isDefault = defaultIndex === id;
    const tags = getTags(idxPattern, isDefault, dataViewsService.getRollupsEnabled());
    const displayName = name ? name : title;

    return {
      id,
      namespaces,
      title,
      name,
      default: isDefault,
      tags,
      // the prepending of 0 at the default pattern takes care of prioritization
      // so the sorting will but the default index on top
      // or on bottom of the table
      sort: `${isDefault ? '0' : '1'}${displayName}`,
      getName: () => displayName,
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

export const getTags = (
  indexPattern: DataViewListItem | DataView,
  isDefault: boolean,
  rollupsEnabled: boolean
) => {
  const tags = [];
  if (isDefault) {
    tags.push({
      key: DataViewType.DEFAULT,
      name: defaultIndexPatternListName,
      'data-test-subj': 'default-tag',
    });
  }
  if (isRollup(indexPattern.type) && rollupsEnabled) {
    tags.push({
      key: DataViewType.ROLLUP,
      name: ROLLUP_DEPRECATION_BADGE_LABEL,
      'data-test-subj': 'rollup-tag',
    });
  }
  return tags;
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
