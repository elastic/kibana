/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PromQLParser } from '../../../../../embedded_languages/promql';
import type { ICommandContext, ISuggestionItem } from '../../../../registry/types';
import { getQueryPosition } from './query_position';
import { getPreGroupedAggregationName } from '../../promql';
import {
  buildNextActionsSuggestion,
  buildVectorSuggestions,
} from './query_positions/suggestion_helpers';
import { positionHandlers } from './query_positions/dispatcher';

interface SuggestForPromqlQueryInput {
  columns: ICommandContext['columns'] | undefined;
  shouldWrap: boolean;
  queryText?: string;
  cursorRelative?: number;
}

export function suggestForPromqlQuery(input: SuggestForPromqlQueryInput): ISuggestionItem[] {
  const { columns, shouldWrap, queryText, cursorRelative } = input;

  if (!queryText || cursorRelative === undefined) {
    return buildVectorSuggestions(columns, [], shouldWrap);
  }

  const { root } = PromQLParser.parse(queryText);
  const position = getQueryPosition(root, cursorRelative, queryText);
  const preGroupedAgg = getPreGroupedAggregationName(queryText.slice(0, cursorRelative));

  if (cursorRelative > root.location.max && position.type === 'inside_query') {
    return buildNextActionsSuggestion({
      columns,
      shouldWrap,
      preGroupedAgg,
      isAfterAggregationName: !!position.isAfterAggregationName,
      canAddGrouping: !!position.canAddGrouping,
    });
  }

  return (
    positionHandlers[position.type]?.({
      position,
      columns,
      shouldWrap,
      preGroupedAgg,
    }) ?? []
  );
}
