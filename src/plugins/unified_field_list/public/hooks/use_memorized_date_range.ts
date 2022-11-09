/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dateMath from '@kbn/datemath';
import { useMemo } from 'react';

export const useMemorizedDateRange = ({
  from: fromDate,
  to: toDate,
}: {
  from: string;
  to: string;
}): { from: string; to: string } => {
  const roundedFromDate = useMemo(() => {
    return dateMath.parse(fromDate)!.startOf('minute').toISOString();
  }, [fromDate]);

  const roundedToDate = useMemo(() => {
    return dateMath.parse(toDate, { roundUp: true })!.endOf('minute').toISOString();
  }, [toDate]);

  return useMemo(
    () => ({
      from: roundedFromDate,
      to: roundedToDate,
    }),
    [roundedFromDate, roundedToDate]
  );
};
