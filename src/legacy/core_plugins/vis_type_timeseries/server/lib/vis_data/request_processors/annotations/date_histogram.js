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

import _ from 'lodash';
import { dateHistogramInterval } from '../../../../../../data/server';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { getTimerange } from '../../helpers/get_timerange';

export function dateHistogram(
  req,
  panel,
  annotation,
  esQueryConfig,
  indexPatternObject,
  capabilities
) {
  return next => doc => {
    const timeField = annotation.time_field;
    const { bucketSize, intervalString } = getBucketSize(req, 'auto', capabilities);
    const { from, to } = getTimerange(req);
    const timezone = capabilities.searchTimezone;

    _.set(doc, `aggs.${annotation.id}.date_histogram`, {
      field: timeField,
      min_doc_count: 0,
      time_zone: timezone,
      extended_bounds: {
        min: from.valueOf(),
        max: to.valueOf() - bucketSize * 1000,
      },
      ...dateHistogramInterval(intervalString),
    });
    return next(doc);
  };
}
