/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_STRING_TYPES } from '../../../../types';
import type { PromqlDetailedPosition, PromqlDetailedPositionType } from '../types';
import { suggestOperators } from './operators';
import { suggestGrouping } from './grouping';
import {
  suggestAfterLabelSelector,
  suggestLabelMatchers,
  suggestLabelValues,
  suggestMetrics,
} from './selectors';
import { buildAddValuePlaceholder } from '../../../../../registry/complete_items';
import type { ISuggestionItem, ICommandContext } from '../../../../../registry/types';
import {
  buildFieldSuggestions,
  buildVectorSuggestions,
  buildCommaWithAutoSuggest,
} from './suggestion_helpers';

export interface SuggestionContext {
  position: PromqlDetailedPosition;
  columns: ICommandContext['columns'] | undefined;
  shouldWrap: boolean;
  preGroupedAgg?: string;
}

export type SuggestionHandler = (input: SuggestionContext) => ISuggestionItem[];

export const positionHandlers: Partial<Record<PromqlDetailedPositionType, SuggestionHandler>> = {
  inside_query: suggestInsideQuery,
  after_operator: suggestAfterOperator,
  inside_grouping: suggestInsideGrouping,
  inside_function_args: suggestInsideFunctionArgs,
  after_complete_arg: suggestAfterCompleteArg,
  after_label_brace: suggestInsideGrouping, // same handler as inside_grouping, kept separate for context readability ({} vs by())
  after_label_name: () => suggestLabelMatchers(),
  after_label_operator: () => suggestLabelValues(),
  after_label_selector: ({ position }) => suggestAfterLabelSelector(position),
  after_metric: ({ position }) => suggestMetrics(position),
};

/** Suggests next tokens while cursor is inside query text. */
function suggestInsideQuery(input: SuggestionContext): ISuggestionItem[] {
  const { position, columns, shouldWrap, preGroupedAgg } = input;

  return suggestGrouping({
    columns,
    shouldWrap,
    preGroupedAgg,
    isAfterAggregationName: !!position.isAfterAggregationName,
    canAddGrouping: !!position.canAddGrouping,
    includePipe: false,
    buildVectorSuggestions,
  });
}

/** Suggests grouping labels or a comma while editing by()/without() labels. */
function suggestInsideGrouping(input: SuggestionContext): ISuggestionItem[] {
  const { position, columns } = input;

  return position.isCompleteLabel
    ? [buildCommaWithAutoSuggest()]
    : buildFieldSuggestions(columns, ESQL_STRING_TYPES, 'plain');
}

/** Suggests operands and scalar literals after a binary operator. */
function suggestAfterOperator(input: SuggestionContext): ISuggestionItem[] {
  const { position, columns, shouldWrap } = input;
  const signatureTypes = position.signatureTypes ?? [];
  const canSuggestScalar = signatureTypes.length === 0 || signatureTypes.includes('scalar');

  return [
    ...buildVectorSuggestions(columns, signatureTypes, shouldWrap),
    ...(canSuggestScalar ? [buildAddValuePlaceholder('number')] : []),
  ];
}

/** Suggests operators or comma after a complete function argument. */
function suggestAfterCompleteArg(input: SuggestionContext): ISuggestionItem[] {
  const { signatureTypes, canSuggestCommaInFunctionArgs } = input.position;
  const expectsRangeVector = signatureTypes?.includes('range_vector');
  const completeArgSuggestions: ISuggestionItem[] = expectsRangeVector
    ? []
    : [...suggestOperators()];

  if (canSuggestCommaInFunctionArgs) {
    completeArgSuggestions.push(buildCommaWithAutoSuggest());
  }

  return completeArgSuggestions;
}

/** Suggests arguments while cursor is inside function argument lists. */
function suggestInsideFunctionArgs(input: SuggestionContext): ISuggestionItem[] {
  const { columns, shouldWrap } = input;
  const { canSuggestCommaInFunctionArgs, signatureTypes: rawSignatureTypes } = input.position;

  if (canSuggestCommaInFunctionArgs) {
    return [buildCommaWithAutoSuggest()];
  }

  const signatureTypes = rawSignatureTypes ?? [];
  const expectsOnlyScalar =
    signatureTypes.length > 0 && signatureTypes.every((type) => type === 'scalar');

  if (expectsOnlyScalar) {
    return [buildAddValuePlaceholder('number')];
  }

  return buildVectorSuggestions(columns, signatureTypes, shouldWrap);
}
