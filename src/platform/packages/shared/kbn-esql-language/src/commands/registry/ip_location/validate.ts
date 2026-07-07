/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isList, isMap } from '@elastic/esql';
import type {
  ESQLAstAllCommands,
  ESQLAstIpLocationCommand,
  ESQLCommand,
} from '@elastic/esql/types';
import { getMessageFromId } from '../../definitions/utils/errors';
import { getExpressionType } from '../../definitions/utils/expressions';
import { getMapEntryByStringKey } from '../../definitions/utils/maps';
import { validateMap } from '../../definitions/utils/validation/map';
import type { ICommandCallbacks, ICommandContext } from '../types';
import type { ESQLMessage } from '../../definitions/types';

const IP_LOCATION_MAP_DEFINITION =
  "{name='database_file', description='IP location database file name', type=[keyword]}" +
  "{name='first_only', description='Use only the first value from multi-value IP input', type=[boolean]}" +
  "{name='properties', description='List of properties to extract', type=[keyword]}";

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
    const propertiesEntry = getMapEntryByStringKey(ipLocationCommand.namedParameters, 'properties');

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
      const mapError = validateMap(namedParameters, IP_LOCATION_MAP_DEFINITION);
      if (mapError) {
        messages.push(mapError);
      }
    }
  }

  return messages;
};
