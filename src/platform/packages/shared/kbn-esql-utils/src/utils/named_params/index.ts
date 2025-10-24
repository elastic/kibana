/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLSearchParams } from '@kbn/es-types';
import type { TimeRange } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { getAutoIntervalParam } from './_tautointerval';
import { getStartEndParams } from './_tstart_end';

export const getNamedParams = (
  query: string,
  timeRange?: TimeRange,
  variables?: ESQLControlVariable[],
  options?: {
    histogramBarTarget?: number;
  }
) => {
  const namedParams: ESQLSearchParams['params'] = getStartEndParams(query, timeRange);
  if (timeRange) {
    namedParams.push(...getAutoIntervalParam(query, timeRange, options?.histogramBarTarget));
  }
  if (variables?.length) {
    variables?.forEach(({ key, value }) => {
      namedParams.push({ [key]: value });
    });
  }
  return namedParams;
};
