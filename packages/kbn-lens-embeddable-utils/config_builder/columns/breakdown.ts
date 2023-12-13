/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { GenericIndexPatternColumn } from '@kbn/lens-plugin/public';
import {
  LensBreakdownConfig,
  LensBreakdownDateHistogramConfig,
  LensBreakdownFiltersConfig,
  LensBreakdownIntervalsConfig,
  LensBreakdownTopValuesConfig,
} from '../types';
import { getHistogramColumn } from './date_histogram';
import { getTopValuesColumn } from './top_values';
import { getIntervalsColumn } from './intervals';
import { getFiltersColumn } from './filters';

const DEFAULT_BREAKDOWN_SIZE = 5;

function getBreakdownType(field: string, dataview: DataView) {
  if (!dataview.fields.getByName(field)) {
    throw new Error(
      `field ${field} does not exist on dataview ${dataview.id ? dataview.id : dataview.title}`
    );
  }

  switch (dataview.fields.getByName(field)!.type) {
    case 'string':
      return 'topValues';
    case 'number':
      return 'intervals';
    case 'date':
      return 'dateHistogram';
    default:
      return 'topValues';
  }
}
export const getBreakdownColumn = ({
  options,
  dataView,
}: {
  options: LensBreakdownConfig;
  dataView: DataView;
}): GenericIndexPatternColumn => {
  const breakdownType =
    typeof options === 'string' ? getBreakdownType(options, dataView) : options.type;
  const field: string =
    typeof options === 'string' ? options : 'field' in options ? options.field : '';
  const config = typeof options !== 'string' ? options : {};

  switch (breakdownType) {
    case 'dateHistogram':
      return getHistogramColumn({
        options: {
          sourceField: field,
          params:
            typeof options !== 'string'
              ? {
                  interval: (options as LensBreakdownDateHistogramConfig).minimumInterval || 'auto',
                }
              : {
                  interval: 'auto',
                },
        },
      });
    case 'topValues':
      const topValuesOptions = config as LensBreakdownTopValuesConfig;
      return getTopValuesColumn({
        field,
        options: {
          size: topValuesOptions.size || DEFAULT_BREAKDOWN_SIZE,
        },
      });
    case 'intervals':
      const intervalOptions = config as LensBreakdownIntervalsConfig;
      return getIntervalsColumn({
        field,
        options: {
          type: 'range',
          ranges: [
            {
              from: 0,
              to: 1000,
              label: '',
            },
          ],
          maxBars: intervalOptions.granularity || 'auto',
        },
      });
    case 'filters':
      const filterOptions = config as LensBreakdownFiltersConfig;
      return getFiltersColumn({
        options: {
          filters: filterOptions.filters.map((f) => ({
            label: f.label || '',
            input: {
              language: 'kuery',
              query: f.filter,
            },
          })),
        },
      });
  }
};
