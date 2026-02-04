/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { handleFragment } from '../../definitions/utils/autocomplete/helpers';
import type { ESQLAstAllCommands } from '../../../types';
import { getSettingsCompletionItems } from '../../definitions/utils/settings';
import {
  isBinaryExpression,
  isIdentifier,
  isMap,
  isStringLiteral,
  isUnknownNode,
  SuggestionCategory,
  within,
} from '../../../..';
import { semiColonCompleteItem, assignCompletionItem } from '../complete_items';
import { type ICommandCallbacks, type ICommandContext, type ISuggestionItem } from '../types';
import { getCompletionItemsBySettingName } from './utils';

// SET <setting> = <value>;
export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
): Promise<ISuggestionItem[]> {
  const innerText = query.substring(0, cursorPosition);
  const settingArg = command.args[0];
  const settingLeftSide = isBinaryExpression(settingArg) ? settingArg.args[0] : null;
  const settingRightSide = isBinaryExpression(settingArg) ? settingArg.args[1] : null;

  const hasSemicolonAtEnd = /^\s*;/.test(query.substring(cursorPosition || 0));

  if (!settingArg) {
    // settingLeftSide is not built until user types '=', so we need to check with regex if the leftside is present
    const hasSettingLeftSide = /SET\s+\S+\s+$/.test(innerText);
    // SET <setting> /
    if (hasSettingLeftSide) {
      return [{ ...assignCompletionItem, detail: '' }];
      // SET /
    } else {
      return getSettingsCompletionItems(callbacks?.isServerless);
    }
  }

  // The value completions depends on the setting name.
  const settingName = isIdentifier(settingLeftSide) ? settingLeftSide.text : '';
  const settingsValueCompletions = getCompletionItemsBySettingName(
    settingName,
    innerText,
    settingRightSide
  );

  // SET <setting> = /
  // SET <setting> = {
  if (
    !settingRightSide ||
    isUnknownNode(settingRightSide) ||
    (Array.isArray(settingRightSide) && settingRightSide.length === 0) ||
    (isMap(settingRightSide) && settingRightSide.incomplete)
  ) {
    return settingsValueCompletions.map((item) => {
      let text = item.category === SuggestionCategory.CONSTANT_VALUE ? `"${item.text}"` : item.text;

      if (!isMap(settingRightSide) && !hasSemicolonAtEnd) {
        text += ';';
      }
      return { ...item, text };
    });
  }

  // SET <setting> = "/  --- Within the value quotes.
  if (isStringLiteral(settingRightSide)) {
    if (cursorPosition && within(cursorPosition, settingRightSide)) {
      const isFragmentComplete = () => {
        return settingRightSide.valueUnquoted.length > 0 && innerText.endsWith('"');
      };
      const getSuggestionsForIncomplete = (): ISuggestionItem[] => {
        return settingsValueCompletions.map((item) => {
          return {
            ...item,
            rangeToReplace: {
              start: settingRightSide.location.min + 1,
              end: innerText.length,
            },
          };
        });
      };
      const getSuggestionsForComplete = () => [];

      return handleFragment(
        innerText,
        isFragmentComplete,
        getSuggestionsForIncomplete,
        getSuggestionsForComplete
      );
    }
  }

  // SET <setting> = <value>/
  if (isBinaryExpression(settingArg) && !settingArg.incomplete && !hasSemicolonAtEnd) {
    return [
      {
        ...semiColonCompleteItem,
        text: ';\n', // Add a new line so the actual query starts in the line below.
      },
    ];
  }

  return [];
}
