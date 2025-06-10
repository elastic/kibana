/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLCommand } from '@kbn/esql-ast';
import { isSingleItem } from '../../../shared/helpers';
import { TRIGGER_SUGGESTION_COMMAND } from '../../factories';
import { SuggestionRawDefinition } from '../../types';
import { isExpressionComplete } from '../../helper';

export type SortPosition = 'expression' | 'complete_expression' | 'after_order' | 'after_nulls';

export const sortModifierSuggestions = {
  ASC: {
    label: 'ASC',
    text: 'ASC',
    detail: '',
    kind: 'Keyword',
    sortText: '1-ASC',
    command: TRIGGER_SUGGESTION_COMMAND,
  } as SuggestionRawDefinition,
  DESC: {
    label: 'DESC',
    text: 'DESC',
    detail: '',
    kind: 'Keyword',
    sortText: '1-DESC',
    command: TRIGGER_SUGGESTION_COMMAND,
  } as SuggestionRawDefinition,
  NULLS_FIRST: {
    label: 'NULLS FIRST',
    text: 'NULLS FIRST',
    detail: '',
    kind: 'Keyword',
    sortText: '2-NULLS FIRST',
    command: TRIGGER_SUGGESTION_COMMAND,
  } as SuggestionRawDefinition,
  NULLS_LAST: {
    label: 'NULLS LAST',
    text: 'NULLS LAST',
    detail: '',
    kind: 'Keyword',
    sortText: '2-NULLS LAST',
    command: TRIGGER_SUGGESTION_COMMAND,
  } as SuggestionRawDefinition,
};

export const getSortPos = (query: string, command: ESQLCommand<'sort'>): SortPosition |  => {
  const lastArg = command.args[command.args.length - 1];
  if (!lastArg || /,\s+$/.test(query)) {
    return 'expression';
  }

  if (isSingleItem(lastArg) && lastArg.type !== 'order') {
    if (isExpressionComplete(lastArg)) {
      return 'complete_expression';
    }
    return 'expression';
  }

  if (/(?:asc|desc)\s+$/i.test(query)) {
    return 'after_order';
  }

  if (/(?:nulls\s+first|nulls\s+last)\s+$/i.test(query)) {
    return 'after_nulls';
  }
};
