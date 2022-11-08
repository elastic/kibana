/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dateMath from '@kbn/datemath';
import { useMemo } from 'react';

export const useMemorizedDateRange = (
  fromDate: string,
  toDate: string
): { from: string; to: string } => {
  return useMemo(() => {
    const roundedDateRange = {
      from: dateMath.parse(fromDate)!.startOf('minute').toISOString(),
      to: dateMath.parse(toDate, { roundUp: true })!.endOf('minute').toISOString(),
    };

    return roundedDateRange;
  }, [fromDate, toDate]);
};
