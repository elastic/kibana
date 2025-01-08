/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { keys } from 'lodash';
import moment, { unitOfTime } from 'moment';

type Units = unitOfTime.Base | unitOfTime._quarter;
type Values = { [key in Units]: number };

// map of moment's short/long unit ids and elasticsearch's long unit ids
// to their value in milliseconds
const unitMappings = [
  ['ms', 'milliseconds', 'millisecond'],
  ['s', 'seconds', 'second', 'sec'],
  ['m', 'minutes', 'minute', 'min'],
  ['h', 'hours', 'hour'],
  ['d', 'days', 'day'],
  ['w', 'weeks', 'week'],
  ['M', 'months', 'month'],
  ['quarter'],
  ['y', 'years', 'year'],
] as Units[][];

const vals = {} as Values;
unitMappings.forEach((units) => {
  const normal = moment.normalizeUnits(units[0]) as Units;
  const val = moment.duration(1, normal).asMilliseconds();
  ([] as Units[]).concat(normal, units).forEach((unit: Units) => {
    vals[unit] = val;
  });
});

// match any key from the vals object preceded by an optional number
const parseRE = new RegExp('^(\\d+(?:\\.\\d*)?)?\\s*(' + keys(vals).join('|') + ')$');

export function toMS(expr: string) {
  const match = expr.match(parseRE);
  if (match) {
    if (match[2] === 'M' && match[1] !== '1') {
      throw new Error('Invalid interval. 1M is only valid monthly interval.');
    }

    return parseFloat(match[1] || '1') * vals[match[2] as Units];
  }
}
