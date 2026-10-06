/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LicenseType } from '@kbn/licensing-types';
import type { PricingProduct } from '@kbn/core-pricing-common/src/types';
import type { ISuggestionItem } from '../../registry/types';
import {
  type FunctionFilterPredicates,
  type FunctionParameterType,
  type FunctionDefinition,
} from '../types';
export declare function getOperatorSuggestion(fn: FunctionDefinition): ISuggestionItem;
/**
 * Builds suggestions for operators based on the provided predicates.
 *
 * @param predicates a set of conditions that must be met for an operator to be included in the suggestions
 * @returns
 */
export declare const getOperatorSuggestions: (
  predicates?: FunctionFilterPredicates & {
    leftParamType?: FunctionParameterType;
  },
  hasMinimumLicenseRequired?: ((minimumLicenseRequired: LicenseType) => boolean) | undefined,
  activeProduct?: PricingProduct | undefined
) => ISuggestionItem[];
