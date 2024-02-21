/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ColorMapping } from '../config';

export function ruleMatch(
  rule: ColorMapping.Config['assignments'][number]['rule'],
  value: string | number | string[]
) {
  switch (rule.type) {
    case 'matchExactly':
      if (Array.isArray(value)) {
        return rule.values.some(
          (v) =>
            Array.isArray(v) && v.length === value.length && v.every((part, i) => part === value[i])
        );
      }
      return rule.values.includes(`${value}`);
    case 'matchExactlyCI':
      return rule.values.some((d) => d.toLowerCase() === `${value}`.toLowerCase());
    case 'range':
      // TODO: color by value not yet possible in all charts in elastic-charts
      return typeof value === 'number' ? rangeMatch(rule, value) : false;
    default:
      return false;
  }
}

export function rangeMatch(rule: ColorMapping.RuleRange, value: number) {
  return (
    (rule.min === rule.max && rule.min === value) ||
    ((rule.minInclusive ? value >= rule.min : value > rule.min) &&
      (rule.maxInclusive ? value <= rule.max : value < rule.max))
  );
}

// TODO: move in some data/table related package
export const SPECIAL_TOKENS_STRING_CONVERTION = new Map([
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
