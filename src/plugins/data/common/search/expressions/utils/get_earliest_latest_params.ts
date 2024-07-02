/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import dateMath from '@kbn/datemath';
import type { TimeRange } from '../../../types';

export const getEarliestLatestParams = (query: string, time?: TimeRange) => {
  const earliestNamedParams = /\?earliest/i.test(query);
  const latestNamedParams = /\?latest/i.test(query);
  if (time && (earliestNamedParams || latestNamedParams)) {
    return {
      earliest: earliestNamedParams ? dateMath.parse(time.from)?.toISOString() : undefined,
      latest: latestNamedParams ? dateMath.parse(time.to)?.toISOString() : undefined,
    };
  }
  return undefined;
};
