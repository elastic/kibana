/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RawValue, deserializeField } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import { ColorMapping } from '../config';

/**
 * Predicate used to match an `Assignment` to a given raw value
 */
export function assignmentMatchFn(rawValue: RawValue) {
  const ruleMatch = ruleMatchFn(rawValue);
  return function assignmentMatch(assignment: ColorMapping.Assignment) {
    return assignment.rules.some((rule) => ruleMatch(rule));
  };
}

/**
 * Predicate used to match an `Assignment` to a given raw value
 */
export function ruleMatchFn(rawValue: RawValue) {
  return function ruleMatch(rule: ColorMapping.ColorRule) {
    switch (rule.type) {
      case 'raw': {
        const key = String(deserializeField(rule.value));
        return key === String(rawValue);
      }
      case 'match': {
        // TODO: decide if we allow comparing the raw or formatted string value
        const pattern = rule.matchCase ? rule.pattern : rule.pattern.toLowerCase();
        const matchValue = rule.matchCase ? String(rawValue) : String(rawValue).toLowerCase();
        if (rule.matchEntireWord) return matchValue === pattern;
        return matchValue.includes(pattern);
      }
      case 'regex': {
        const pattern = new RegExp(rule.pattern);
        return pattern.test(String(rawValue));
      }
      case 'range': {
        // TODO: color by value not yet possible in all charts in elastic-charts
        return typeof rawValue === 'number' ? rangeMatch(rule, rawValue) : false;
      }
      default:
        return false;
    }
  };
}

function rangeMatch(rule: ColorMapping.RuleRange, value: number) {
  return (
    (rule.min === rule.max && rule.min === value) ||
    ((rule.minInclusive ? value >= rule.min : value > rule.min) &&
      (rule.maxInclusive ? value <= rule.max : value < rule.max))
  );
}

// TODO: move in some data/table related package
export const SPECIAL_TOKENS_STRING_CONVERSION = new Map([
  [
    '__other__',
    i18n.translate('coloring.colorMapping.terms.otherBucketLabel', {
      defaultMessage: 'Other',
    }),
  ],
  [
    '',
    i18n.translate('coloring.colorMapping.terms.emptyLabel', {
      defaultMessage: '(empty)',
    }),
  ],
]);

/**
 * Returns special string for sake of color mapping/syncing
 */
export const getSpecialString = (value: string) =>
  SPECIAL_TOKENS_STRING_CONVERSION.get(value) ?? value;
