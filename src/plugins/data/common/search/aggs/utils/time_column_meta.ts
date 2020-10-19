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

import moment from 'moment-timezone';
import { DatatableColumn } from 'src/plugins/expressions/common';
import { IndexPattern } from '../../../index_patterns';

import { TimeRange } from '../../../types';
import { AggParamsDateHistogram, BUCKET_TYPES } from '../buckets';

export const getDateMetaByDatatableColumn = ({
  calculateAutoTimeExpression,
  getIndexPattern,
  isDefaultTimezone,
  getConfig,
}: {
  calculateAutoTimeExpression: (range: TimeRange) => string | undefined;
  getIndexPattern: (id: string) => Promise<IndexPattern>;
  isDefaultTimezone: () => boolean;
  getConfig: <T = any>(key: string) => T;
}) => async (
  column: DatatableColumn
): Promise<undefined | { timeZone?: string; timeRange: TimeRange; interval?: string }> => {
  if (column.meta.source !== 'esaggs') return;
  if (column.meta.sourceParams?.type !== BUCKET_TYPES.DATE_HISTOGRAM) return;
  const params = column.meta.sourceParams.params as AggParamsDateHistogram;
  const appliedTimeRange = column.meta.sourceParams.appliedTimeRange as TimeRange;

  let tz = params.time_zone;
  if (!tz && params.field) {
    // If a field has been configured check the index pattern's typeMeta if a date_histogram on that
    // field requires a specific time_zone
    tz = (await getIndexPattern(column.meta.sourceParams.indexPatternId as string)).typeMeta?.aggs
      ?.date_histogram?.[params.field]?.time_zone;
  }
  if (!tz) {
    // If the index pattern typeMeta data, didn't had a time zone assigned for the selected field use the configured tz
    const detectedTimezone = moment.tz.guess();
    const tzOffset = moment().format('Z');
    tz = isDefaultTimezone() ? detectedTimezone || tzOffset : getConfig('dateFormat:tz');
  }
  return {
    timeZone: tz,
    timeRange: appliedTimeRange,
    interval:
      // TODO is it really possible interval is undefined?
      params.interval === 'auto' ? calculateAutoTimeExpression(appliedTimeRange) : params.interval,
  };
};
