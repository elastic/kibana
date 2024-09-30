/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

import { FilteringPolicy, FilteringRuleRule } from '..';

const filteringRuleStringMap: Record<FilteringRuleRule, string> = {
  contains: i18n.translate('searchConnectors.content.filteringRules.rules.contains', {
    defaultMessage: 'Contains',
  }),
  ends_with: i18n.translate('searchConnectors.content.filteringRules.rules.endsWith', {
    defaultMessage: 'Ends with',
  }),
  equals: i18n.translate('searchConnectors.content.filteringRules.rules.equals', {
    defaultMessage: 'Equals',
  }),
  ['>']: i18n.translate('searchConnectors.content.filteringRules.rules.greaterThan', {
    defaultMessage: 'Greater than',
  }),
  ['<']: i18n.translate('searchConnectors.content.filteringRules.rules.lessThan', {
    defaultMessage: 'Less than',
  }),
  regex: i18n.translate('searchConnectors.content.filteringRules.rules.regEx', {
    defaultMessage: 'Regular expression',
  }),
  starts_with: i18n.translate('searchConnectors.content.filteringRules.rules.startsWith', {
    defaultMessage: 'Starts with',
  }),
};

export function filteringRuleToText(filteringRule: FilteringRuleRule): string {
  return filteringRuleStringMap[filteringRule];
}

const filteringPolicyStringMap: Record<FilteringPolicy, string> = {
  exclude: i18n.translate('searchConnectors.content.filteringRules.policy.exclude', {
    defaultMessage: 'Exclude',
  }),
  include: i18n.translate('searchConnectors.content.filteringRules.policy.include', {
    defaultMessage: 'Include',
  }),
};

export function filteringPolicyToText(filteringPolicy: FilteringPolicy): string {
  return filteringPolicyStringMap[filteringPolicy];
}
