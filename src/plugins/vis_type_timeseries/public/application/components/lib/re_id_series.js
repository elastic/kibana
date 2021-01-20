/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import uuid from 'uuid';
import _ from 'lodash';

export const reIdSeries = (source) => {
  const series = _.cloneDeep(source);
  series.id = uuid.v1();
  series.metrics.forEach((metric) => {
    const id = uuid.v1();
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
            v.id = uuid.v1();
            v.field = id;
          });
      });
  });
  return series;
};
