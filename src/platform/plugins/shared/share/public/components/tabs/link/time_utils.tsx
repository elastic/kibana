/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import kbnDatemath from '@kbn/datemath';

const unitMap = new Map([
  ['s', 'second'],
  ['m', 'minute'],
  ['h', 'hour'],
  ['d', 'day'],
  ['w', 'week'],
  ['M', 'month'],
  ['y', 'year'],
]);

export const getRelativeValueAndUnit = (date?: string) => {
  if (!date) return;
  const match = date.match(/^now([+-]\d+)([smhdwMy])$/);
  if (!match) return;

  const [, signAndNumber, unit] = match;

  return {
    value: Number(signAndNumber),
    unit: unitMap.get(unit),
  };
};

export const convertRelativeToAbsoluteDate = (date?: string) => {
  const valueParsed = kbnDatemath.parse(date || '');

  return valueParsed?.isValid() ? valueParsed.toDate() : undefined;
};

export const isTimeRangeAbsoluteTime = (timeRange?: { from: string; to: string }) =>
  !(timeRange?.from?.includes('now') || timeRange?.to?.includes('now'));
