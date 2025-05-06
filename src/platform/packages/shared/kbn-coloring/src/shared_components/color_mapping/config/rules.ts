/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializedValue } from '@kbn/data-plugin/common';

/**
 * A rule that matches based on raw values
 */
export interface RuleMatchRaw {
  type: 'raw';
  /**
   * Serialized form of raw row value
   */
  value: SerializedValue;
}

/**
 * Rule to match values, optionally case-sensitive and entire word
 */
export interface RuleMatch {
  type: 'match';
  /**
   * The string to search for
   */
  pattern: string;
  /**
   * Whether the pattern should match an entire word
   *
   * @default false
   */
  matchEntireWord?: boolean;
  /**
   * Whether the search should be case-sensitive
   *
   * @default false
   */
  matchCase?: boolean;
}

/**
 * Regex rule
 */
export interface RuleRegExp {
  type: 'regex';
  /**
   * RegExp pattern as string including flags (i.e. `/[a-z]+/i`)
   */
  pattern: string;
}

/**
 * Rule for numerical data range assignments
 */
export interface RuleRange {
  type: 'range';
  /**
   * The min value of the range
   */
  min: number;
  /**
   * The max value of the range
   */
  max: number;
  /**
   * `true` if the range is left-closed (the `min` value is considered within the range), false otherwise (only values that are
   * greater than the `min` are considered within the range)
   */
  minInclusive: boolean;
  /**
   * `true` if the range is right-closed (the `max` value is considered within the range), false otherwise (only values less than
   * the `max` are considered within the range)
   */
  maxInclusive: boolean;
}

/**
 * A specific catch-everything-else rule
 */
export interface RuleOthers {
  type: 'other';
}

/**
 * All available color rules
 */
export type ColorRule = RuleMatchRaw | RuleMatch | RuleRegExp | RuleRange;
