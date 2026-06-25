/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useRef } from 'react';
import moment from 'moment';

import { DATE_RANGE_INPUT_DELIMITER } from '../constants';

/**
 * Hint categories, each represented by a function that returns a hint string.
 * Categories cycle sequentially; within each category, a random example is picked.
 */
const HINT_CATEGORIES: Array<() => string> = [
  // Named ranges
  () => pickRandom(['today', 'yesterday', 'tomorrow']),

  // Natural durations
  () =>
    pickRandom([
      'last 7 days',
      'last 15 minutes',
      'last 24 hours',
      'next 3 hours',
      'last 30 days',
      'last 2 weeks',
    ]),

  // Natural instants
  () => pickRandom(['30 minutes ago', '2 hours ago', '3 days ago', '1 week ago']),

  // Shorthand
  () => pickRandom(['-7d', '-2w', '-15m', '-24h', '+1d']),

  // Absolute ranges (context-aware, based on current date)
  () => {
    const end = moment();
    const daysBack = pickRandom([7, 14, 30, 90]);
    const start = moment().subtract(daysBack, 'days');
    return `${start.format('MMM D YYYY')} ${DATE_RANGE_INPUT_DELIMITER} ${end.format(
      'MMM D YYYY'
    )}`;
  },
];

/**
 * Returns a rotating hint string for the date range input placeholder.
 * The hint educates users about the kinds of expressions the input can parse.
 * Each time {@link text} transitions from non-empty to empty (i.e. the input is cleared),
 * the hint cycles to the next category of expression.
 *
 * @param text - The current input text value
 * @returns A hint string suitable for use as a placeholder
 */
export function useInputHintText(text: string): string {
  const categoryIndexRef = useRef(Math.floor(Math.random() * HINT_CATEGORIES.length));
  const previousTextRef = useRef(text);
  const hintRef = useRef(HINT_CATEGORIES[categoryIndexRef.current]());

  if (previousTextRef.current !== '' && text === '') {
    categoryIndexRef.current = (categoryIndexRef.current + 1) % HINT_CATEGORIES.length;
    hintRef.current = HINT_CATEGORIES[categoryIndexRef.current]();
  }
  previousTextRef.current = text;

  return hintRef.current;
}

/**
 * Picks a random element from a non-empty array.
 */
function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
