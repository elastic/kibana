/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { overwrite } from '../../helpers';
import { bucketTransform } from '../../helpers/bucket_transform';
import { get } from 'lodash';

export function metricBuckets(req, panel, series) {
  return (next) => async (doc) => {
    series.metrics
      .filter((row) => !/_bucket$/.test(row.type) && !/^series/.test(row.type))
      .forEach((metric) => {
        const fn = bucketTransform[metric.type];
        const intervalString = get(doc, `aggs.${series.id}.meta.intervalString`);

        if (fn) {
          try {
            const bucket = fn(metric, series.metrics, intervalString);
            overwrite(doc, `aggs.${series.id}.aggs.timeseries.aggs.${metric.id}`, bucket);
          } catch (e) {
            // meh
          }
        }
      });
    return next(doc);
  };
}
