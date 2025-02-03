/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Regexp portion that matches our number
 *
 * supports:
 *   -100
 *   -100.0
 *   0
 *   0.10
 *   Infinity
 *   -Infinity
 *
 * @type {String}
 */
const _RE_NUMBER = '(\\-?(?:\\d+(?:\\.\\d+)?|Infinity))';

/**
 * Regexp for the interval notation
 *
 * supports:
 *   [num, num]
 *   ( num , num ]
 *   [Infinity,num)
 *
 * @type {RegExp}
 */
const RANGE_RE = new RegExp(
  '^\\s*([\\[|\\(])\\s*' + _RE_NUMBER + '\\s*,\\s*' + _RE_NUMBER + '\\s*([\\]|\\)])\\s*$'
);

export class NumberListRange {
  constructor(
    public minInclusive: boolean,
    public min: number,
    public max: number,
    public maxInclusive: boolean
  ) {}

  within(n: number): boolean {
    if ((this.min === n && !this.minInclusive) || this.min > n) return false;
    if ((this.max === n && !this.maxInclusive) || this.max < n) return false;

    return true;
  }
}

export function parseRange(input: string): NumberListRange {
  const match = String(input).match(RANGE_RE);
  if (!match) {
    throw new TypeError('expected input to be in interval notation e.g., (100, 200]');
  }

  const args = [match[1] === '[', parseFloat(match[2]), parseFloat(match[3]), match[4] === ']'];

  if (args[1] > args[2]) {
    args.reverse();
  }

  const [minInclusive, min, max, maxInclusive] = args;

  return new NumberListRange(
    minInclusive as boolean,
    min as number,
    max as number,
    maxInclusive as boolean
  );
}
