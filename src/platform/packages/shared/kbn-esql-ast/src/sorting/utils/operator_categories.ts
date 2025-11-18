/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  arithmeticOperators,
  comparisonFunctions,
  nullCheckOperators,
  inOperators,
  patternMatchOperators,
  logicalOperators,
} from '../../definitions/all_operators';
import { SuggestionCategory } from '../types';

const operatorCategoryMap = new Map<string, SuggestionCategory>();

function initializeOperatorCategories() {
  // Only initialize once
  if (operatorCategoryMap.size > 0) {
    return;
  }

  arithmeticOperators.forEach(({ name }) => {
    operatorCategoryMap.set(name.toLowerCase(), SuggestionCategory.OPERATOR_ARITHMETIC);
  });

  comparisonFunctions.forEach(({ name }) => {
    operatorCategoryMap.set(name.toLowerCase(), SuggestionCategory.OPERATOR_COMPARISON);
  });

  nullCheckOperators.forEach(({ name }) => {
    operatorCategoryMap.set(name.toLowerCase(), SuggestionCategory.OPERATOR_NULL_CHECK);
  });

  inOperators.forEach(({ name }) => {
    operatorCategoryMap.set(name.toLowerCase(), SuggestionCategory.OPERATOR_IN);
  });

  patternMatchOperators.forEach(({ name }) => {
    operatorCategoryMap.set(name.toLowerCase(), SuggestionCategory.OPERATOR_PATTERN);
  });

  logicalOperators.forEach(({ name }) => {
    operatorCategoryMap.set(name.toLowerCase(), SuggestionCategory.OPERATOR_LOGICAL);
  });

  operatorCategoryMap.set('not', SuggestionCategory.OPERATOR_LOGICAL);
}

export function getOperatorCategory(operatorName: string): SuggestionCategory {
  initializeOperatorCategories();

  const normalizedName = operatorName.toLowerCase();
  return operatorCategoryMap.get(normalizedName) ?? SuggestionCategory.OPERATOR;
}
