/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { get } from 'lodash';
import { overwrite, bucketTransform } from '../../helpers';
import { calculateAggRoot } from './calculate_agg_root';
import type { TableRequestProcessorsFunction } from './types';

export const siblingBuckets: TableRequestProcessorsFunction =
  ({ panel }) =>
  (next) =>
  async (doc) => {
    panel.series.forEach((column) => {
      const aggRoot = calculateAggRoot(doc, column);

      column.metrics
        .filter((row) => /_bucket$/.test(row.type))
        .forEach((metric) => {
          // @ts-expect-error should be typed
          const fn = bucketTransform[metric.type];

          if (fn) {
            try {
              const intervalString = get(doc, aggRoot.replace(/\.aggs$/, '.meta.intervalString'));
              const bucket = fn(metric, column.metrics, intervalString);

              overwrite(doc, `${aggRoot}.${metric.id}`, bucket);
            } catch (e) {
              // meh
            }
          }
        });
    });

    return next(doc);
  };
