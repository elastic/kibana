/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql } from '@elastic/esql';
import { TIME_SYSTEM_PARAMS } from '@kbn/esql-language';
import type { DateHistogramIndexPatternColumn } from '../../datasources/operations';
import { AUTO_TARGET_NUMBER_OF_BUCKETS } from '../constants';
import {
  AUTO_INTERVAL,
  DEFAULT_DATE_HISTOGRAM_INTERVAL,
  getTimeZoneAndInterval,
  hasDateRange,
  mapToEsqlInterval,
} from './date_histogram_helpers';
import type { ToEsqlFn } from './types';

export const dateHistogramToESQL: ToEsqlFn<DateHistogramIndexPatternColumn> = (
  column,
  _columnId,
  indexPattern,
  _layer,
  _uiSettings,
  dateRange
) => {
  if (column.params?.includeEmptyRows) return;
  const { interval } = getTimeZoneAndInterval(column, indexPattern);
  const esqlColumnNode = esql.col(column.sourceField);

  if (interval === AUTO_INTERVAL) {
    if (hasDateRange(dateRange)) {
      const [ESQL_TIME_RANGE_START, ESQL_TIME_RANGE_END] = TIME_SYSTEM_PARAMS;
      return {
        template: `BUCKET(${esqlColumnNode}, ${AUTO_TARGET_NUMBER_OF_BUCKETS}, ${ESQL_TIME_RANGE_START}, ${ESQL_TIME_RANGE_END})`,
      };
    }
    // Fall back to default 1h when date range is missing
    return {
      template: `BUCKET(${esqlColumnNode}, ${mapToEsqlInterval(DEFAULT_DATE_HISTOGRAM_INTERVAL)})`,
    };
  }

  return {
    template: `BUCKET(${esqlColumnNode}, ${mapToEsqlInterval(interval)})`,
  };
};
