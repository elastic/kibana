/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dateMath from '@kbn/datemath';

const unitMap = new Map([
  ['s', 'second'],
  ['m', 'minute'],
  ['h', 'hour'],
  ['d', 'day'],
  ['w', 'week'],
  ['M', 'month'],
  ['y', 'year'],
]);

export const getRelativeTimeValueAndUnitFromTimeString = (dateString?: string) => {
  if (!dateString) return;

  const mathPart = dateString.split('/')[0]; // Ignore rounding part for matching
  const roundingPart = dateString.includes('/') ? dateString.split('/')[1] : undefined;

  // Handle plain 'now' without offset
  if (mathPart === 'now') {
    return {
      value: 0,
      unit: 'second',
      roundingUnit: roundingPart ? unitMap.get(roundingPart) : undefined,
    };
  }

  const match = mathPart.match(/^now([+-]\d+)([smhdwMy])$/);
  if (!match) return;

  const [, signAndNumber, unit] = match;

  return {
    value: Number(signAndNumber),
    unit: unitMap.get(unit),
    roundingUnit: roundingPart ? unitMap.get(roundingPart) : undefined,
  };
};

export const convertRelativeTimeStringToAbsoluteTimeDate = (
  dateString?: string,
  options?: { roundUp?: boolean }
) => {
  if (!dateString) return;
  const valueParsed = dateMath.parse(dateString, options);

  return valueParsed?.isValid() ? valueParsed.toDate() : undefined;
};

export const convertRelativeTimeStringToAbsoluteTimeString = (
  dateString?: string,
  options?: { roundUp?: boolean }
) => {
  if (!dateString) return dateString;
  const valueParsed = dateMath.parse(dateString, options);

  return valueParsed && valueParsed.isValid() ? valueParsed.toISOString() : dateString;
};

export const isTimeRangeAbsoluteTime = (timeRange?: { from: string; to: string }) =>
  !(timeRange?.from?.includes('now') || timeRange?.to?.includes('now'));
