/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildEsQuery } from '@kbn/es-query';
import { bucketTransform } from '../../helpers/bucket_transform';
import { overwrite } from '../../helpers';

const filter = (metric) => metric.type === 'filter_ratio';

export function ratios(req, panel, series, esQueryConfig, seriesIndex) {
  return (next) => (doc) => {
    if (series.metrics.some(filter)) {
      series.metrics.filter(filter).forEach((metric) => {
        overwrite(
          doc,
          `aggs.${series.id}.aggs.timeseries.aggs.${metric.id}-numerator.filter`,
          buildEsQuery(seriesIndex.indexPattern, metric.numerator, [], esQueryConfig)
        );
        overwrite(
          doc,
          `aggs.${series.id}.aggs.timeseries.aggs.${metric.id}-denominator.filter`,
          buildEsQuery(seriesIndex.indexPattern, metric.denominator, [], esQueryConfig)
        );

        let numeratorPath = `${metric.id}-numerator>_count`;
        let denominatorPath = `${metric.id}-denominator>_count`;

        if (metric.metric_agg !== 'count' && bucketTransform[metric.metric_agg]) {
          let metricAgg;
          try {
            metricAgg = bucketTransform[metric.metric_agg]({
              type: metric.metric_agg,
              field: metric.field,
            });
          } catch (e) {
            metricAgg = {};
          }
          const aggBody = { metric: metricAgg };
          overwrite(
            doc,
            `aggs.${series.id}.aggs.timeseries.aggs.${metric.id}-numerator.aggs`,
            aggBody
          );
          overwrite(
            doc,
            `aggs.${series.id}.aggs.timeseries.aggs.${metric.id}-denominator.aggs`,
            aggBody
          );
          numeratorPath = `${metric.id}-numerator>metric`;
          denominatorPath = `${metric.id}-denominator>metric`;
        }

        overwrite(doc, `aggs.${series.id}.aggs.timeseries.aggs.${metric.id}`, {
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
    return next(doc);
  };
}
