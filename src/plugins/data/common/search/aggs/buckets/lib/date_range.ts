/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export interface DateRangeKey {
  from: number | string;
  to: number | string;
}

export function convertDateRangeToString({ from, to }: DateRangeKey, format: (val: any) => string) {
  if (!from) {
    return 'Before ' + format(to);
  } else if (!to) {
    return 'After ' + format(from);
  } else {
    return format(from) + ' to ' + format(to);
  }
}
