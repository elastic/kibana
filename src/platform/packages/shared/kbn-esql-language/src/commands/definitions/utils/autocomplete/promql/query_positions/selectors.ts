/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ISuggestionItem } from '../../../../../registry/types';
import type { PromQLFunctionDefinition } from '../../../../types';
import { promqlLabelMatcherDefinitions } from '../../../../generated/promql_label_matchers';
import { buildFunctionDocumentation } from '../../../documentation';
import { techPreviewLabel } from '../../../shared';
import { suggestOperators } from './operators';
import type { PromqlDetailedPosition } from '../types';
import {
  promqlLabelSelectorItem,
  promqlRangeSelectorItem,
  valuePlaceholderConstant,
} from '../../../../../registry/complete_items';

/** Suggests selector/range/operator tokens after a metric name. */
export const suggestMetrics = (position: PromqlDetailedPosition): ISuggestionItem[] => {
  const { signatureTypes, selector } = position;
  const metricSuggestions: ISuggestionItem[] = [promqlLabelSelectorItem];
  const expectsRangeVector = signatureTypes?.includes('range_vector');
  const { duration } = selector ?? {};

  if (expectsRangeVector && !duration) {
    metricSuggestions.push(...suggestTimeDurations());
  } else {
    metricSuggestions.push(...suggestOperators());
  }

  return metricSuggestions;
};

/** Suggests the next token after a closed label selector. */
export const suggestAfterLabelSelector = (position: PromqlDetailedPosition): ISuggestionItem[] => {
  const { signatureTypes, canSuggestRangeSelector } = position;
  const expectsRangeVector = signatureTypes?.includes('range_vector');

  if (expectsRangeVector && canSuggestRangeSelector) {
    return suggestTimeDurations();
  }

  return [...suggestOperators()];
};

/** Suggests label matcher operators after a label name. */
export const suggestLabelMatchers = (): ISuggestionItem[] => {
  return promqlLabelMatcherDefinitions
    .filter(({ ignoreAsSuggestion }) => !ignoreAsSuggestion)
    .map(buildPromqlLabelMatcherSuggestion);
};

/** Suggests placeholder values after a label matcher operator. */
export const suggestLabelValues = (): ISuggestionItem[] => [valuePlaceholderConstant];

/** Suggests PromQL duration snippets for range selector contexts. */
export const suggestTimeDurations = (): ISuggestionItem[] => [promqlRangeSelectorItem];

/** Converts one label matcher definition into an autocomplete suggestion. */
const buildPromqlLabelMatcherSuggestion = (
  definition: PromQLFunctionDefinition
): ISuggestionItem => {
  const { description, examples, operator, name, preview } = definition;
  const docDetail = preview ? `**[${techPreviewLabel}]** ${description}` : description;
  const symbol = operator ?? name;

  return {
    label: symbol,
    text: `${symbol} `,
    asSnippet: false,
    kind: 'Operator',
    detail: description,
    documentation: {
      value: buildFunctionDocumentation(docDetail, [], examples),
    },
  };
};
