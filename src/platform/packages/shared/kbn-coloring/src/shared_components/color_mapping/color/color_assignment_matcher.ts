/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RawValue, deserializeField } from '@kbn/data-plugin/common';
import { ColorMapping } from '../config';
import { getValueKey } from './utils';

type AssignmentMatchCount = [assignmentIndex: number, matchCount: number];

/**
 * A class to encapsulate assignment logic
 */
export class ColorAssignmentMatcher {
  /**
   * Reference to original assignments
   */
  readonly #assignments: ColorMapping.Assignment[];

  /**
   * Map values (or keys) to assignment index and match count
   */
  #assignmentMap: Map<string, AssignmentMatchCount>;

  constructor(assignments: ColorMapping.Assignment[]) {
    this.#assignments = assignments;
    this.#assignmentMap = this.#assignments.reduce<Map<string, AssignmentMatchCount>>(
      (acc, assignment, i) => {
        assignment.rules.forEach((rule) => {
          const key = getKey(rule);
          if (key !== null) {
            const [index = i, matchCount = 0] = acc.get(key) ?? [];
            acc.set(key, [index, matchCount + 1]);
          }
        });
        return acc;
      },
      new Map()
    );
  }

  #getMatch(value: RawValue): AssignmentMatchCount {
    const key = getValueKey(value);
    return this.#assignmentMap.get(key) ?? [-1, 0];
  }

  /**
   * Returns count of matching assignments for given value
   */
  getCount(value: RawValue) {
    const [, count] = this.#getMatch(value);
    return count;
  }

  /**
   * Returns true if given value has multiple matching assignment
   */
  hasDuplicate(value: RawValue) {
    const [, count] = this.#getMatch(value);
    return count > 1;
  }

  /**
   * Returns true if given value has matching assignment
   */
  hasMatch(value: RawValue) {
    return this.getCount(value) > 0;
  }

  /**
   * Returns index of first matching assignment for given value
   */
  getIndex(value: RawValue) {
    const [index] = this.#getMatch(value);
    return index;
  }
}

function getKey(rule: ColorMapping.ColorRule): string | null {
  if (rule.type === 'match' && rule.matchEntireWord) {
    return rule.matchCase ? rule.pattern : rule.pattern.toLowerCase();
  }

  if (rule.type === 'raw') {
    return getValueKey(deserializeField(rule.value));
  }

  // nondeterministic match, cannot assign ambiguous keys
  // requires pattern matching all previous rules
  return null;
}

/**
 * A simplified map to track assignment match counts
 *
 * key: stringified value or key of instance methods
 * value: count of matching assignments
 */
export function getColorAssignmentMatcher(assignments: ColorMapping.Assignment[]) {
  return new ColorAssignmentMatcher(assignments);
}
