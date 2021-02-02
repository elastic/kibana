/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { esQuery } from '../../../../../../data/server';
import { bucketTransform } from '../../helpers/bucket_transform';
import { overwrite } from '../../helpers';
import { calculateAggRoot } from './calculate_agg_root';

const filter = (metric) => metric.type === 'filter_ratio';

export function ratios(req, panel, esQueryConfig, indexPatternObject) {
  return (next) => (doc) => {
    panel.series.forEach((column) => {
      const aggRoot = calculateAggRoot(doc, column);
      if (column.metrics.some(filter)) {
        column.metrics.filter(filter).forEach((metric) => {
          overwrite(
            doc,
            `${aggRoot}.timeseries.aggs.${metric.id}-numerator.filter`,
            esQuery.buildEsQuery(indexPatternObject, metric.numerator, [], esQueryConfig)
          );
          overwrite(
            doc,
            `${aggRoot}.timeseries.aggs.${metric.id}-denominator.filter`,
            esQuery.buildEsQuery(indexPatternObject, metric.denominator, [], esQueryConfig)
          );

          let numeratorPath = `${metric.id}-numerator>_count`;
          let denominatorPath = `${metric.id}-denominator>_count`;

          if (metric.metric_agg !== 'count' && bucketTransform[metric.metric_agg]) {
            const aggBody = {
              metric: bucketTransform[metric.metric_agg]({
                type: metric.metric_agg,
                field: metric.field,
              }),
            };
            overwrite(doc, `${aggRoot}.timeseries.aggs.${metric.id}-numerator.aggs`, aggBody);
            overwrite(doc, `${aggRoot}.timeseries.aggs.${metric.id}-denominator.aggs`, aggBody);
            numeratorPath = `${metric.id}-numerator>metric`;
            denominatorPath = `${metric.id}-denominator>metric`;
          }

          overwrite(doc, `${aggRoot}.timeseries.aggs.${metric.id}`, {
            bucket_script: {
              buckets_path: {
                numerator: numeratorPath,
                denominator: denominatorPath,
              },
              script:
                'params.numerator != null && params.denominator != null && params.denominator > 0 ? params.numerator / params.denominator : 0',
            },
          });
        });
      }
    });
    return next(doc);
  };
}
