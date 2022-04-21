/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dateMath from '@kbn/datemath';

export type Unit = 'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'M' | 'y';

export const leastCommonInterval = (num = 0, base = 0) =>
  Math.max(Math.ceil(num / base) * base, base);

export const isCalendarInterval = ({ unit, value }: { unit: Unit; value: number }) => {
  const { unitsMap } = dateMath;
  return value === 1 && ['calendar', 'mixed'].includes(unitsMap[unit].type);
};
