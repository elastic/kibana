/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { countBy } from 'lodash';
import {
  RuleTypeIndexWithDescriptions,
  RuleTypeCountsByProducer,
  RuleTypeWithDescription,
} from '../../types';

export const filterAndCountRuleTypes: (
  ruleTypeIndex: RuleTypeIndexWithDescriptions,
  selectedProducer: string | null,
  searchString: string
) => [RuleTypeWithDescription[], RuleTypeCountsByProducer] = (
  ruleTypeIndex,
  selectedProducer,
  searchString
) => {
  const ruleTypeValues = [...ruleTypeIndex.values()];
  if (!ruleTypeValues.length) return [[], { total: 0 }];

  // Filter by search first to preserve totals in the facets
  const ruleTypesFilteredBySearch = ruleTypeValues.filter((ruleType) => {
    if (searchString) {
      const lowerCaseSearchString = searchString.toLowerCase();
      return (
        ruleType.name.toLowerCase().includes(lowerCaseSearchString) ||
        (ruleType.description && ruleType.description.toLowerCase().includes(lowerCaseSearchString))
      );
    }
    return true;
  });
  const ruleTypesFilteredBySearchAndProducer = ruleTypesFilteredBySearch.filter((ruleType) => {
    if (selectedProducer && ruleType.producer !== selectedProducer) return false;
    return true;
  });
  return [
    ruleTypesFilteredBySearchAndProducer,
    {
      ...countBy(ruleTypesFilteredBySearch, 'producer'),
      total: ruleTypesFilteredBySearch.length,
    },
  ];
};
