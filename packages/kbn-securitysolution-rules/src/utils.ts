/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isPlainObject } from 'lodash';

import { RuleType, RuleTypeId, ruleTypeMappings } from './rule_type_mappings';
import { SearchTypes } from './types';

export const isRuleType = (ruleType: unknown): ruleType is RuleType => {
  return Object.keys(ruleTypeMappings).includes(ruleType as string);
};

export const isRuleTypeId = (ruleTypeId: unknown): ruleTypeId is RuleTypeId => {
  return Object.values(ruleTypeMappings).includes(ruleTypeId as RuleTypeId);
};

export const flattenWithPrefix = (
  prefix: string,
  maybeObj: unknown
): Record<string, SearchTypes> => {
  if (maybeObj != null && isPlainObject(maybeObj)) {
    return Object.keys(maybeObj as Record<string, SearchTypes>).reduce(
      (acc: Record<string, SearchTypes>, key) => {
        return {
          ...acc,
          ...flattenWithPrefix(`${prefix}.${key}`, (maybeObj as Record<string, SearchTypes>)[key]),
        };
      },
      {}
    );
  } else {
    return {
      [prefix]: maybeObj as SearchTypes,
    };
  }
};
