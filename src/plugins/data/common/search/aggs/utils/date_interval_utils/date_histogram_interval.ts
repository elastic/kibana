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

import { parseEsInterval } from './parse_es_interval';

type Interval = { fixed_interval: string } | { calendar_interval: string };

/**
 * Checks whether a given Elasticsearch interval is a calendar or fixed interval
 * and returns an object containing the appropriate date_histogram property for that
 * interval. So it will return either an object containing the fixed_interval key for
 * that interval or a calendar_interval. If the specified interval was not a valid Elasticsearch
 * interval this method will throw an error.
 *
 * You can simply spread the returned value of this method into your date_histogram.
 * @example
 * const aggregation = {
 *   date_histogram: {
 *     field: 'date',
 *     ...dateHistogramInterval('24h'),
 *   }
 * };
 *
 * @param interval The interval string to return the appropriate date_histogram key for.
 */
export function dateHistogramInterval(interval: string): Interval {
  const { type } = parseEsInterval(interval);
  if (type === 'calendar') {
    return { calendar_interval: interval };
  } else {
    return { fixed_interval: interval };
  }
}
