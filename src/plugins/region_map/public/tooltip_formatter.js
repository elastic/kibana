/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export function tooltipFormatter(metric, fieldFormatter, fieldName, metricName) {
  if (!metric) {
    return '';
  }

  const details = [];
  if (fieldName && metric) {
    details.push({
      label: fieldName,
      value: metric.term,
    });
  }

  if (metric) {
    details.push({
      label: metricName,
      value: fieldFormatter ? fieldFormatter.convert(metric.value, 'text') : metric.value,
    });
  }
  return details;
}
