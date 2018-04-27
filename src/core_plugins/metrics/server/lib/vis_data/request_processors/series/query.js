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

import offsetTime from '../../offset_time';
import getIntervalAndTimefield from '../../get_interval_and_timefield';
import getBucketSize from '../../helpers/get_bucket_size';
import { isMetric } from '../../../../../common/metric_types';
import { hasSiblingAggs } from '../../helpers/has_sibling_aggs';

export default function query(req, panel, series) {
  return next => doc => {
    const { timeField, interval } = getIntervalAndTimefield(panel, series);
    const { bucketSize } = getBucketSize(req, interval);
    const { from, to } = offsetTime(req, series.offset_time);

    const boundsMin = isMetric(panel.type) && !hasSiblingAggs(series) ?
      to.clone().subtract(5 * bucketSize, 's') :
      from;

    doc.size = 0;
    doc.query = {
      bool: {
        must: []
      }
    };

    const timerange = {
      range: {
        [timeField]: {
          gte: panel.timerange_mode === 'all' ? from.valueOf() : boundsMin.valueOf(),
          lte: to.valueOf(),
          format: 'epoch_millis',
        }
      }
    };
    doc.query.bool.must.push(timerange);

    const globalFilters = req.payload.filters;
    if (globalFilters && !panel.ignore_global_filter) {
      doc.query.bool.must = doc.query.bool.must.concat(globalFilters);
    }

    if (panel.filter) {
      doc.query.bool.must.push({
        query_string: {
          query: panel.filter,
          analyze_wildcard: true
        }
      });
    }

    if (series.filter) {
      doc.query.bool.must.push({
        query_string: {
          query: series.filter,
          analyze_wildcard: true
        }
      });
    }

    return next(doc);

  };
}
