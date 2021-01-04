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

import { DatatableColumn } from 'src/plugins/expressions/common';
import { IndexPattern } from '../../../index_patterns';

import { TimeRange } from '../../../types';
import { AggParamsDateHistogram, BUCKET_TYPES } from '../buckets';
import { inferTimeZone } from './infer_time_zone';

export interface DateMetaByColumnDeps {
  calculateAutoTimeExpression: (range: TimeRange) => string | undefined;
  getIndexPattern: (id: string) => Promise<IndexPattern>;
  isDefaultTimezone: () => boolean;
  getConfig: <T = any>(key: string) => T;
}

export const getDateMetaByDatatableColumn = ({
  calculateAutoTimeExpression,
  getIndexPattern,
  isDefaultTimezone,
  getConfig,
}: DateMetaByColumnDeps) => async (
  column: DatatableColumn
): Promise<undefined | { timeZone: string; timeRange?: TimeRange; interval: string }> => {
  if (column.meta.source !== 'esaggs') return;
  if (column.meta.sourceParams?.type !== BUCKET_TYPES.DATE_HISTOGRAM) return;
  const params = column.meta.sourceParams.params as AggParamsDateHistogram;
  const appliedTimeRange = column.meta.sourceParams.appliedTimeRange as TimeRange | undefined;

  const tz = inferTimeZone(
    params,
    await getIndexPattern(column.meta.sourceParams.indexPatternId as string),
    isDefaultTimezone,
    getConfig
  );

  const interval =
    params.interval === 'auto' && appliedTimeRange
      ? calculateAutoTimeExpression(appliedTimeRange)
      : params.interval;

  if (!interval || interval === 'auto') {
    throw new Error('time interval could not be determined');
  }

  return {
    timeZone: tz,
    timeRange: appliedTimeRange,
    interval,
  };
};
