/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import moment from 'moment';

const allowedUnits = ['s', 'm', 'h', 'd', 'w', 'M', 'y'] as const;
type AllowedUnit = typeof allowedUnits[number];

/**
 * This method parses a string into a time shift duration.
 * If parsing fails, 'invalid' is returned.
 * Allowed values are the string 'previous' and an integer followed by the units s,m,h,d,w,M,y
 *  */
export const parseTimeShift = (val: string): moment.Duration | 'previous' | 'invalid' => {
  const trimmedVal = val.trim();
  if (trimmedVal === 'previous') {
    return 'previous';
  }
  const [, amount, unit] = trimmedVal.match(/^(\d+)(\w)$/) || [];
  const parsedAmount = Number(amount);
  if (Number.isNaN(parsedAmount) || !allowedUnits.includes(unit as AllowedUnit)) {
    return 'invalid';
  }
  return moment.duration(Number(amount), unit as AllowedUnit);
};
