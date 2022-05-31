/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dateMath from '@kbn/datemath';
import { TimeRange } from '../../../..';

export function toAbsoluteDates(range: TimeRange) {
  const fromDate = dateMath.parse(range.from);
  const toDate = dateMath.parse(range.to, { roundUp: true });

  if (!fromDate || !toDate) {
    return;
  }

  return {
    from: fromDate.toDate(),
    to: toDate.toDate(),
  };
}
