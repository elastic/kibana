import type { LicenseType } from '@kbn/licensing-types';
import type { PricingProduct } from '@kbn/core-pricing-common/src/types';
import type { ISuggestionItem } from '../../registry/types';
import { type FunctionFilterPredicates, type FunctionParameterType, type FunctionDefinition } from '../types';
export declare function getOperatorSuggestion(fn: FunctionDefinition): ISuggestionItem;
/**
 * Builds suggestions for operators based on the provided predicates.
 *
 * @param predicates a set of conditions that must be met for an operator to be included in the suggestions
 * @returns
 */
export declare const getOperatorSuggestions: (predicates?: FunctionFilterPredicates & {
    leftParamType?: FunctionParameterType;
}, hasMinimumLicenseRequired?: ((minimumLicenseRequired: LicenseType) => boolean) | undefined, activeProduct?: PricingProduct | undefined) => ISuggestionItem[];
