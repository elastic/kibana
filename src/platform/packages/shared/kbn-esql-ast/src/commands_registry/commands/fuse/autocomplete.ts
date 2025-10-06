/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isCommand, isOptionNode } from '@kbn/esql-ast/src/ast/is';
import type { ESQLAstFuseCommand, ESQLAstItem, ESQLCommand, ESQLCommandOption, ESQLIdentifier } from '../../../types';
import { pipeCompleteItem } from '../../complete_items';
import type { ICommandCallbacks } from '../../types';
import { type ISuggestionItem, type ICommandContext } from '../../types';
import { withAutoSuggest } from '@kbn/esql-ast';

enum FusePosition {
  BEFORE_NEW_ARGUMENT = 'before_new_argument',
  AFTER_FUSE_TYPE = 'after_fuse_type',
  AFTER_CONFIG_ITEM = 'after_config_item',
  SCORE_BY = 'score_by',
  KEY_BY = 'key_by',
  GROUP_BY = 'group_by',
  WITH = 'with',
}

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
): Promise<ISuggestionItem[]> {
  const fuseCommand = command as ESQLAstFuseCommand;
  const position = getPosition(query, fuseCommand);
  console.log('position', position)
  switch (position) {
    case FusePosition.BEFORE_NEW_ARGUMENT:
      return getFuseArgumentsSuggestions(fuseCommand);
  }

  return [pipeCompleteItem];
}

function getPosition(
  query: string,
  command: ESQLAstFuseCommand,
): FusePosition {
  const { scoreBy, keyBy, groupBy, withOption } = extractFuseArgs(command);

  if (scoreBy && scoreBy.incomplete) {
    return FusePosition.SCORE_BY;
  }

  if (keyBy && keyBy.incomplete) {
    return FusePosition.KEY_BY;
  }

  if (groupBy && groupBy.incomplete) {
    return FusePosition.GROUP_BY;
  }
  
  if (withOption && withOption.incomplete) {
    return FusePosition.WITH;
  }

  return FusePosition.BEFORE_NEW_ARGUMENT;
}

function extractFuseArgs(command: ESQLAstFuseCommand): Partial<{
  fuseType: ESQLIdentifier;
  scoreBy: ESQLCommandOption;
  keyBy: ESQLCommandOption;
  groupBy: ESQLCommandOption;
  withOption: ESQLCommandOption;
}> {

  const fuseType = command.fuseType;
  const scoreBy = findCommandOptionByName(command, 'score by');
  const keyBy = findCommandOptionByName(command, 'key by');
  const groupBy = findCommandOptionByName(command, 'group by');
  const withOption = findCommandOptionByName(command, 'with');

  return { fuseType, scoreBy, keyBy, groupBy, withOption };
}

function findCommandOptionByName(
  command: ESQLCommand,
  name: string
): ESQLCommandOption | undefined {
  return command.args.find(
    (arg): arg is ESQLCommandOption =>
      isOptionNode(arg) && arg.name.toLowerCase() === name.toLowerCase()
  );
}

function getFuseArgumentsSuggestions(
  command: ESQLAstFuseCommand,
): ISuggestionItem[] {
  const suggestions: ISuggestionItem[] = [pipeCompleteItem];

  const { fuseType, scoreBy, keyBy, groupBy, withOption } = extractFuseArgs(command);

  if (!fuseType) {
    suggestions.push(
    {
      label: 'linear',
      kind: 'Reference',
      detail: 'fuse type',
      text: 'linear ',
      sortText: '0',
    },{
      label: 'rrf',
      kind: 'Reference',
      detail: 'fuse type',
      text: 'rrf ',
      sortText: '0',
    });
  }

  if (!scoreBy) {
    suggestions.push(withAutoSuggest({
      label: 'SCORE BY',
      kind: 'Reference',
      detail: 'score by <field>',
      text: 'SCORE BY ',
      sortText: '1',
    }));
  }

  if (!keyBy) {
    suggestions.push(withAutoSuggest({
      label: 'KEY BY',
      kind: 'Reference',
      detail: 'key by <field>',
      text: 'KEY BY ',
      sortText: '2',
    }));
  }

  if (!groupBy) {
    suggestions.push(withAutoSuggest({
      label: 'GROUP BY',
      kind: 'Reference',
      detail: 'group by <field>',
      text: 'GROUP BY ',
      sortText: '3',
    }));
  }

  if (!withOption) {
    suggestions.push(withAutoSuggest({
      label: 'WITH',
      kind: 'Reference',
      detail: 'with <option>',
      text: 'WITH ',
      sortText: '4',
    }));
  }

  return suggestions;
}

