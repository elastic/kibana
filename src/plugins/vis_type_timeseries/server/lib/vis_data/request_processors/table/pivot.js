/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { get, last } from 'lodash';
import { overwrite } from '../../helpers';

import { basicAggs } from '../../../../../common/basic_aggs';
import { getBucketsPath } from '../../helpers/get_buckets_path';
import { bucketTransform } from '../../helpers/bucket_transform';

export function pivot(req, panel) {
  return (next) => (doc) => {
    const { sort } = req.payload.state;

    if (panel.pivot_id) {
      overwrite(doc, 'aggs.pivot.terms.field', panel.pivot_id);
      overwrite(doc, 'aggs.pivot.terms.size', panel.pivot_rows);
      if (sort) {
        const series = panel.series.find((item) => item.id === sort.column);
        const metric = series && last(series.metrics);
        if (metric && metric.type === 'count') {
          overwrite(doc, 'aggs.pivot.terms.order', { _count: sort.order });
        } else if (metric && basicAggs.includes(metric.type)) {
          const sortAggKey = `${metric.id}-SORT`;
          const fn = bucketTransform[metric.type];
          const bucketPath = getBucketsPath(metric.id, series.metrics).replace(
            metric.id,
            sortAggKey
          );
          overwrite(doc, `aggs.pivot.terms.order`, { [bucketPath]: sort.order });
          overwrite(doc, `aggs.pivot.aggs`, { [sortAggKey]: fn(metric) });
        } else {
          overwrite(doc, 'aggs.pivot.terms.order', {
            _key: get(sort, 'order', 'asc'),
          });
        }
      }
    } else {
      overwrite(doc, 'aggs.pivot.filter.match_all', {});
    }
    return next(doc);
  };
}
