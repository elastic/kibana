/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import _ from 'lodash';

export const reIdSeries = (source) => {
  const series = _.cloneDeep(source);
  series.id = uuidv4();
  series.metrics.forEach((metric) => {
    const id = uuidv4();
    const metricId = metric.id;
    metric.id = id;
    if (series.terms_order_by === metricId) series.terms_order_by = id;
    series.metrics.filter((r) => r.field === metricId).forEach((r) => (r.field = id));
    series.metrics
      .filter((r) => r.type === 'calculation' && r.variables.some((v) => v.field === metricId))
      .forEach((r) => {
        r.variables
          .filter((v) => v.field === metricId)
          .forEach((v) => {
            v.id = uuidv4();
            v.field = id;
          });
      });
  });
  return series;
};
