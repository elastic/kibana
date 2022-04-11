/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dateMath from '@kbn/datemath';
import { TimeRange } from '../../../../common';

export function validateTimeRange(time?: TimeRange): boolean {
  if (!time) return false;
  const momentDateFrom = dateMath.parse(time.from);
  const momentDateTo = dateMath.parse(time.to);
  return !!(momentDateFrom && momentDateFrom.isValid() && momentDateTo && momentDateTo.isValid());
}
