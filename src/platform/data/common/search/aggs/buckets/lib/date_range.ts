/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DateRange } from '../../../expressions';

export function convertDateRangeToString({ from, to }: DateRange, format: (val: any) => string) {
  if (!from) {
    return 'Before ' + format(to);
  } else if (!to) {
    return 'After ' + format(from);
  } else {
    return format(from) + ' to ' + format(to);
  }
}
