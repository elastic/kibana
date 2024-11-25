/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Datatable } from '@kbn/expressions-plugin/common';

export const getDataBoundsForPalette = (
  accessors: { metric: string; max?: string; breakdownBy?: string },
  data?: Datatable,
  rowNumber?: number
) => {
  if (!data) {
    return { min: -Infinity, max: Infinity };
  }

  const smallestMetric = Math.min(...data.rows.map((row) => row[accessors.metric]));
  const greatestMetric = Math.max(...data.rows.map((row) => row[accessors.metric]));

  if (
    !accessors.max &&
    !accessors.breakdownBy &&
    (typeof rowNumber !== 'undefined' || data.rows.length === 1)
  ) {
    // dealing with a single metric and no max
    const metricValue = greatestMetric;
    return metricValue < 0 ? { min: metricValue * 2, max: 0 } : { min: 0, max: metricValue * 2 };
  }

  const greatestMaximum = accessors.max
    ? rowNumber
      ? data.rows[rowNumber][accessors.max]
      : Math.max(...data.rows.map((row) => row[accessors.max!]))
    : greatestMetric;

  const dataMin = accessors.breakdownBy && !accessors.max ? smallestMetric : 0;

  const dataMax = accessors.breakdownBy
    ? accessors.max
      ? greatestMaximum
      : greatestMetric
    : greatestMaximum;

  return { min: dataMin, max: dataMax };
};
