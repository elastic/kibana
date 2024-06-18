/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import dateMath from '@kbn/datemath';
import type { TimeRange } from '../../../types';

export const getEarliestLatestParams = (timeField?: string, time?: TimeRange) => {
  let earliest = '';
  let latest = '';
  if (time && timeField && timeField !== '@timestamp') {
    earliest = time.from;
    latest = time.to;
  }
  return {
    earliest: dateMath.parse(earliest)?.toISOString(),
    latest: dateMath.parse(latest)?.toISOString(),
  };
};
