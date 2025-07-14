/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCommand } from '../../../..';
import { TRIGGER_SUGGESTION_COMMAND } from '../../constants';
import { ISuggestionItem } from '../../types';

export type SortPosition =
  | 'empty_expression'
  | 'expression'
  | 'order_complete'
  | 'after_order'
  | 'nulls_complete'
  | 'after_nulls';

export const sortModifierSuggestions = {
  ASC: {
    label: 'ASC',
    text: 'ASC',
    detail: '',
    kind: 'Keyword',
    sortText: '1-ASC',
    command: TRIGGER_SUGGESTION_COMMAND,
  } as ISuggestionItem,
  DESC: {
    label: 'DESC',
    text: 'DESC',
    detail: '',
    kind: 'Keyword',
    sortText: '1-DESC',
    command: TRIGGER_SUGGESTION_COMMAND,
  } as ISuggestionItem,
  NULLS_FIRST: {
    label: 'NULLS FIRST',
    text: 'NULLS FIRST',
    detail: '',
    kind: 'Keyword',
    sortText: '2-NULLS FIRST',
    command: TRIGGER_SUGGESTION_COMMAND,
  } as ISuggestionItem,
  NULLS_LAST: {
    label: 'NULLS LAST',
    text: 'NULLS LAST',
    detail: '',
    kind: 'Keyword',
    sortText: '2-NULLS LAST',
    command: TRIGGER_SUGGESTION_COMMAND,
  } as ISuggestionItem,
};

export const getSortPos = (
  query: string,
  command: ESQLCommand<'sort'>
): SortPosition | undefined => {
  const lastArg = command.args[command.args.length - 1];
  if (!lastArg || /,\s+$/.test(query)) {
    return 'empty_expression';
  }

  if (!Array.isArray(lastArg) && lastArg.type !== 'order') {
    return 'expression';
  }

  if (/(?:asc|desc)$/i.test(query)) {
    return 'order_complete';
  }

  if (/(?:asc|desc)\s+$/i.test(query)) {
    return 'after_order';
  }

  if (/(?:nulls\s+first|nulls\s+last)$/i.test(query)) {
    return 'nulls_complete';
  }

  if (/(?:nulls\s+first|nulls\s+last)\s+$/i.test(query)) {
    return 'after_nulls';
  }
};
