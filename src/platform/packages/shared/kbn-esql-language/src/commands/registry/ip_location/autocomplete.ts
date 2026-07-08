/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { isStringLiteral } from '@elastic/esql';
import type { ESQLAstAllCommands, ESQLAstIpLocationCommand } from '@elastic/esql/types';
import { getCommandMapExpressionSuggestions } from '../../definitions/utils/autocomplete/map_expression';
import { suggestForExpression } from '../../definitions/utils';
import { ESQL_STRING_TYPES } from '../../definitions/types';
import {
  assignCompletionItem,
  buildAddValuePlaceholder,
  buildMapValueCompleteItem,
  getNewUserDefinedColumnSuggestion,
  newLineAndPipeCompleteItems,
  withCompleteItem,
} from '../complete_items';
import type { ICommandCallbacks, ICommandContext, ISuggestionItem } from '../types';
import { Location } from '../types';
import {
  getDatabaseFileSuggestions,
  getPosition,
  getPropertiesList,
  getPropertyNamesForDatabase,
  IpLocationPosition,
} from './utils';

const getDatabaseFileMapParameter = () => ({
  type: 'string' as const,
  description: i18n.translate(
    'kbn-esql-language.commands.ipLocation.autocomplete.databaseFileDescription',
    { defaultMessage: 'IP location database file name' }
  ),
  suggestions: getDatabaseFileSuggestions().map((databaseFile) =>
    buildMapValueCompleteItem(databaseFile)
  ),
});

const getPropertiesMapParameter = () => ({
  type: 'array' as const,
  description: i18n.translate(
    'kbn-esql-language.commands.ipLocation.autocomplete.propertiesDescription',
    { defaultMessage: 'List of properties to extract' }
  ),
  suggestions: [buildMapValueCompleteItem('[ $0 ]', '[]')],
});

const getFirstOnlyMapParameter = () => ({
  type: 'boolean' as const,
  description: i18n.translate(
    'kbn-esql-language.commands.ipLocation.autocomplete.firstOnlyDescription',
    { defaultMessage: 'Use only the first value from multi-value IP input' }
  ),
  suggestions: [buildMapValueCompleteItem('true'), buildMapValueCompleteItem('false')],
});

export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition: number = query.length
): Promise<ISuggestionItem[]> {
  if (!callbacks?.getByType) {
    return [];
  }

  const innerText = query.substring(0, cursorPosition);
  const ipLocationCommand = command as ESQLAstIpLocationCommand;
  const position = getPosition(ipLocationCommand, innerText);

  switch (position) {
    case IpLocationPosition.AFTER_IP_LOCATION_KEYWORD:
      return [
        getNewUserDefinedColumnSuggestion(callbacks.getSuggestedUserDefinedColumnName?.() || ''),
      ];

    case IpLocationPosition.AFTER_TARGET_FIELD:
      return [assignCompletionItem];

    case IpLocationPosition.AFTER_ASSIGN: {
      const { suggestions } = await suggestForExpression({
        query,
        expressionRoot: ipLocationCommand.expression,
        command,
        cursorPosition,
        location: Location.EVAL,
        context,
        callbacks,
        options: {
          preferredExpressionType: ['ip', ...ESQL_STRING_TYPES],
        },
      });
      return suggestions;
    }

    case IpLocationPosition.AFTER_EXPRESSION:
      return [withCompleteItem, ...newLineAndPipeCompleteItems];

    case IpLocationPosition.AFTER_WITH_KEYWORD:
      return [buildAddValuePlaceholder('config')];

    case IpLocationPosition.WITHIN_OPTIONS:
      return getCommandMapExpressionSuggestions(innerText, {
        database_file: getDatabaseFileMapParameter(),
        properties: getPropertiesMapParameter(),
        first_only: getFirstOnlyMapParameter(),
      });

    case IpLocationPosition.WITHIN_PROPERTIES_ARRAY: {
      const propertiesList = getPropertiesList(ipLocationCommand);
      const usedValues = new Set(
        propertiesList?.values.filter(isStringLiteral).map((value) => value.valueUnquoted) ?? []
      );

      return getPropertyNamesForDatabase(ipLocationCommand)
        .filter((property) => !usedValues.has(property))
        .map((property) => buildMapValueCompleteItem(`"${property}"`));
    }

    case IpLocationPosition.AFTER_COMMAND:
      return newLineAndPipeCompleteItems;

    default:
      return [];
  }
}
