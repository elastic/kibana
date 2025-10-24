/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { computeInterval } from '@kbn/visualization-utils';
import type { TimeRange } from '@kbn/es-query';

export const getAutoIntervalParam = (
  query: string,
  time: TimeRange,
  histogramBarTarget?: number
) => {
  const interval = computeInterval(time, histogramBarTarget);
  const namedParams = [];
  const autoIntervalNamedParameter = /\?_tautointerval/i.test(query);
  if (autoIntervalNamedParameter) {
    namedParams.push({ _tautointerval: interval });
  }
  return namedParams;
};
