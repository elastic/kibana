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

import { overwrite } from '../../helpers';
import { basicAggs } from '../../../../../common/basic_aggs';
import { getBucketsPath } from '../../helpers/get_buckets_path';
import { bucketTransform } from '../../helpers/bucket_transform';

export function splitByTerms(req, panel, series) {
  return (next) => (doc) => {
    if (series.split_mode === 'terms' && series.terms_field) {
      const direction = series.terms_direction || 'desc';
      const metric = series.metrics.find((item) => item.id === series.terms_order_by);
      overwrite(doc, `aggs.${series.id}.terms.field`, series.terms_field);
      overwrite(doc, `aggs.${series.id}.terms.size`, series.terms_size);
      if (series.terms_include) {
        overwrite(doc, `aggs.${series.id}.terms.include`, series.terms_include);
      }
      if (series.terms_exclude) {
        overwrite(doc, `aggs.${series.id}.terms.exclude`, series.terms_exclude);
      }
      if (metric && metric.type !== 'count' && ~basicAggs.indexOf(metric.type)) {
        const sortAggKey = `${series.terms_order_by}-SORT`;
        const fn = bucketTransform[metric.type];
        const bucketPath = getBucketsPath(series.terms_order_by, series.metrics).replace(
          series.terms_order_by,
          sortAggKey
        );
        overwrite(doc, `aggs.${series.id}.terms.order`, { [bucketPath]: direction });
        overwrite(doc, `aggs.${series.id}.aggs`, { [sortAggKey]: fn(metric) });
      } else if (['_key', '_count'].includes(series.terms_order_by)) {
        overwrite(doc, `aggs.${series.id}.terms.order`, { [series.terms_order_by]: direction });
      } else {
        overwrite(doc, `aggs.${series.id}.terms.order`, { _count: direction });
      }
    }
    return next(doc);
  };
}
