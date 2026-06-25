/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isMap, isList, isStringLiteral } from '@elastic/esql';
import type {
  ESQLAstAllCommands,
  ESQLAstIpLocationCommand,
  ESQLCommand,
} from '@elastic/esql/types';
import { getMessageFromId } from '../../definitions/utils/errors';
import { getExpressionType } from '../../definitions/utils/expressions';
import { validateMap } from '../../definitions/utils/validation/map';
import type { ICommandCallbacks, ICommandContext } from '../types';
import type { ESQLMessage } from '../../definitions/types';

// `properties` uses type=[keyword] so validateMap doesn't false-error on valid list values
// (getExpressionType delegates list type to its first element, which is keyword for string literals).
// The list constraint is enforced separately with isList below.
const IP_LOCATION_MAP_DEFINITION =
  "{name='database_file', description='IP location database file name', type=[keyword]}" +
  "{name='properties', description='List of database properties to include in the output', type=[keyword]}" +
  "{name='first_only', description='Use only the first value from a multi-value IP input', type=[boolean]}";

const ACCEPTED_EXPRESSION_TYPES = ['ip', 'keyword', 'text', 'param', 'unknown'] as const;

export const validate = (
  command: ESQLAstAllCommands,
  _ast: ESQLCommand[],
  context?: ICommandContext,
  _callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];
  const ipLocationCommand = command as ESQLAstIpLocationCommand;
  const { expression, namedParameters } = ipLocationCommand;

  if (expression && !expression.incomplete) {
    const expressionType = getExpressionType(
      expression,
      context?.columns,
      context?.unmappedFieldsStrategy
    );
    if (
      !ACCEPTED_EXPRESSION_TYPES.includes(
        expressionType as (typeof ACCEPTED_EXPRESSION_TYPES)[number]
      )
    ) {
      messages.push(
        getMessageFromId({
          messageId: 'unsupportedColumnTypeForCommand',
          values: {
            command: command.name.toUpperCase(),
            type: 'ip, keyword, text',
            column: expression.text,
            givenType: expressionType,
          },
          locations: expression.location,
        })
      );
    }
  }

  if (namedParameters && !Array.isArray(namedParameters) && isMap(namedParameters)) {
    const propertiesEntry = namedParameters.entries.find(
      (entry) => isStringLiteral(entry.key) && entry.key.valueUnquoted === 'properties'
    );

    // Check `properties` first: validateMap cannot distinguish a plain string from a list
    // (getExpressionType delegates list type to its first element). Handle it explicitly so
    // the error always reads "expected type: list" regardless of the actual value type.
    if (propertiesEntry && !propertiesEntry.incomplete && !isList(propertiesEntry.value)) {
      messages.push(
        getMessageFromId({
          messageId: 'invalidMapParameterValueType',
          values: {
            paramName: 'properties',
            expectedType: 'list',
            actualType: getExpressionType(
              propertiesEntry.value,
              context?.columns,
              context?.unmappedFieldsStrategy
            ),
          },
          locations: propertiesEntry.value.location,
        })
      );
    } else {
      // properties is valid or absent — let validateMap handle unknown keys and type
      // checks for database_file and first_only.
      const mapError = validateMap(namedParameters, IP_LOCATION_MAP_DEFINITION);
      if (mapError) {
        messages.push(mapError);
      }
    }
  }

  return messages;
};
