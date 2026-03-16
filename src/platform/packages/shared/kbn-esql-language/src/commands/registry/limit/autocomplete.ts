/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Parser } from '@elastic/esql';
import type { ESQLAstAllCommands, ESQLAstField } from '@elastic/esql/types';
import type { ICommandCallbacks } from '../types';
import { Location, type ISuggestionItem, type ICommandContext } from '../types';
import { pipeCompleteItem, byCompleteItem, defaultLimitValueSuggestions } from '../complete_items';
import { esqlCommandRegistry } from '..';
import { correctQuerySyntax } from '../../definitions/utils/ast';
import { buildConstantsDefinitions } from '../../definitions/utils/literals';
import { suggestFieldsList } from '../../definitions/utils/autocomplete/fields_list';
import { getByColumns, getByOption, getPosition } from './utils';

export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
): Promise<ISuggestionItem[]> {
  const innerText = query.substring(0, cursorPosition);
  const position = getPosition(command, innerText);
  // TODO: Remove these temporary guards once LIMIT BY is fully supported in Elasticsearch.
  const limitByHidden = esqlCommandRegistry.getCommandByName(command.name)?.metadata.limitByHidden;
  const hasSortBeforeCurrentLimit = hasSortBeforeCurrentLimitCommand(innerText, command);

  switch (position) {
    case 'after_limit_keyword': {
      return buildConstantsDefinitions(defaultLimitValueSuggestions, '', undefined, {
        advanceCursorAndOpenSuggestions: true,
      });
    }

    case 'after_value': {
      return limitByHidden || hasSortBeforeCurrentLimit
        ? [pipeCompleteItem]
        : [byCompleteItem, pipeCompleteItem];
    }

    case 'grouping_expression_without_assignment':
    case 'grouping_expression_after_assignment': {
      if (limitByHidden || hasSortBeforeCurrentLimit) {
        return [];
      }

      const byNode = getByOption(command);
      if (!byNode) {
        return [];
      }

      return suggestFieldsList(
        query,
        command,
        byNode.args as ESQLAstField[],
        Location.LIMIT_BY,
        callbacks,
        context,
        cursorPosition ?? query.length,
        {
          ignoredColumnsForEmptyExpression: getByColumns(byNode),
          allowSingleColumnFields: true,
        }
      );
    }

    default:
      return [];
  }
}

function hasSortBeforeCurrentLimitCommand(
  query: string,
  currentCommand: ESQLAstAllCommands
): boolean {
  // TODO: Remove this temporary local parse once Elasticsearch supports SORT before LIMIT BY.
  // Like DISSECT and GROK autocomplete, reparse the corrected query to inspect surrounding AST context.
  const correctedQuery = correctQuerySyntax(query);
  const { root } = Parser.parse(correctedQuery, { withFormatting: true });
  const commandIndex = root.commands.findIndex(
    (command) =>
      command.name === currentCommand.name &&
      command.location.min === currentCommand.location.min &&
      command.location.max === currentCommand.location.max
  );

  if (commandIndex <= 0) {
    return false;
  }

  return root.commands.slice(0, commandIndex).some((command) => command.name === 'sort');
}
