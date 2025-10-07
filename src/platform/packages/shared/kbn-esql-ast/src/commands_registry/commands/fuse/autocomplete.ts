/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLAstFuseCommand, ESQLCommand } from '../../../types';
import type { ICommandCallbacks } from '../../types';
import { type ISuggestionItem, type ICommandContext } from '../../types';
import {
  scoreByAutocomplete,
  groupByAutocomplete,
  keyByAutocomplete,
  fuseArgumentsAutocomplete,
} from './autocomplete_handlers';
import { extractFuseArgs } from './utils';

export enum FusePosition {
  BEFORE_NEW_ARGUMENT = 'before_new_argument',
  SCORE_BY = 'score_by',
  KEY_BY = 'key_by',
  GROUP_BY = 'group_by',
  WITH = 'with',
}

export function getPosition(innerText: string, command: ESQLAstFuseCommand): FusePosition {
  const { scoreBy, keyBy, groupBy, withOption } = extractFuseArgs(command);

  if ((scoreBy && scoreBy.incomplete) || /SCORE BY\s+\S*$/i.test(innerText)) {
    return FusePosition.SCORE_BY;
  }

  if ((groupBy && groupBy.incomplete) || /GROUP BY\s+\S*$/i.test(innerText)) {
    return FusePosition.GROUP_BY;
  }

  if ((keyBy && keyBy.incomplete) || /KEY BY(\s+\S+,?)+$/i.test(innerText)) {
    return FusePosition.KEY_BY;
  }

  if (withOption && withOption.incomplete) {
    return FusePosition.WITH;
  }

  return FusePosition.BEFORE_NEW_ARGUMENT;
}

// FUSE <fuse_method> SCORE BY <score_column> GROUP BY <group_column> KEY BY <key_columns> WITH <options>
export async function autocomplete(
  query: string,
  command: ESQLCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
): Promise<ISuggestionItem[]> {
  const fuseCommand = command as ESQLAstFuseCommand;

  const innerText = query.substring(0, cursorPosition);

  const position = getPosition(innerText, fuseCommand);

  switch (position) {
    // FUSE arguments can be suggested in any order, except for <fuse_method> which should come first if present.
    // <fuse_method>, SCORE BY, KEY BY, GROUP BY, WITH
    case FusePosition.BEFORE_NEW_ARGUMENT:
      return fuseArgumentsAutocomplete(fuseCommand);

    // SCORE BY suggests a single field of double type
    case FusePosition.SCORE_BY:
      return await scoreByAutocomplete(innerText, callbacks, context);

    // GROUP BY suggests a single field of string type
    case FusePosition.GROUP_BY:
      return await groupByAutocomplete(innerText, callbacks, context);

    // KEY BY suggests multiple fields of string type
    case FusePosition.KEY_BY:
      return await keyByAutocomplete(innerText, fuseCommand, callbacks, context);

    // WITH suggests a map of options that depends on the <fuse_method>
    case FusePosition.WITH:
      return [];
  }
}
