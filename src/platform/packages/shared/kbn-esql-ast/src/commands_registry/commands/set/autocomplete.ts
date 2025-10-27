/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { handleFragment } from '../../../definitions/utils/autocomplete/helpers';
import type { ESQLAstAllCommands } from '../../../types';
import { getSettingsCompletionItems } from '../../../definitions/utils/settings';
import {
  assignCompletionItem,
  isBinaryExpression,
  isIdentifier,
  isStringLiteral,
  isUnknownNode,
  semiColonCompleteItem,
  within,
} from '../../../..';
import type { ICommandCallbacks } from '../../types';
import { type ISuggestionItem, type ICommandContext } from '../../types';

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

  // SET /
  if (!settingArg) {
    // settingLeftSide is not built until user types '=', so we need to check with regex if the leftside is present
    const hasSettingLeftSide = /SET\s+\S+\s+$/.test(innerText);
    if (hasSettingLeftSide) {
      return [{ ...assignCompletionItem, detail: '' }];
    } else {
      return getSettingsCompletionItems(callbacks?.isServerless);
    }
  }

  // The value completions depends on the setting name.
  const settingsValueCompletions =
    COMPLETIONS_BY_SETTING_NAME[isIdentifier(settingLeftSide) ? settingLeftSide.text : ''] ?? [];

  // SET <setting> = /
  if (!settingRightSide || isUnknownNode(settingRightSide)) {
    return settingsValueCompletions.map((item) => ({
      ...item,
      text: `"${item.text}";`,
    }));
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
  if (isBinaryExpression(settingArg) && !settingArg.incomplete) {
    return [
      {
        ...semiColonCompleteItem,
        text: ';\n', // Add a new line so the actual query starts in the line below.
      },
    ];
  }

  return [];
}

const getProjectRoutingCommonCompletionItems = (): ISuggestionItem[] => {
  return [
    {
      label: '_alias:_origin',
      text: '_alias:_origin',
      kind: 'Value',
      detail: i18n.translate(
        'kbn-esql-ast.esql.autocomplete.set.projectRouting.currentProjectDoc',
        {
          defaultMessage: 'Search only the current project',
        }
      ),
      sortText: '1',
    },
    {
      label: '_alias: *',
      text: '_alias: *',
      kind: 'Value',
      detail: i18n.translate('kbn-esql-ast.esql.autocomplete.set.projectRouting.allProjectsDoc', {
        defaultMessage: 'Search all projects',
      }),
      sortText: '1',
    },
  ];
};

const COMPLETIONS_BY_SETTING_NAME: Record<string, ISuggestionItem[]> = {
  project_routing: getProjectRoutingCommonCompletionItems(),
};
