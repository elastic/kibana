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
  ESQLAstUserAgentCommand,
  ESQLCommand,
  ESQLMessage,
} from '@elastic/esql/types';
import { getMessageFromId } from '../../definitions/utils/errors';
import { getExpressionType } from '../../definitions/utils/expressions';
import { validateMap } from '../../definitions/utils/validation/map';
import type { ICommandCallbacks, ICommandContext } from '../types';

// `properties` uses type=[keyword] so validateMap doesn't false-error on valid list values
// (getExpressionType delegates list type to its first element, which is keyword for string literals).
// The list constraint is enforced separately with isList below.
const USER_AGENT_MAP_DEFINITION =
  "{name='regex_file', description='Parser configuration file name', type=[keyword]}" +
  "{name='extract_device_type', description='Extract device type', type=[boolean]}" +
  "{name='properties', values=[name, version, os, device], description='List of properties to extract', type=[keyword]}";

const ACCEPTED_EXPRESSION_TYPES = ['keyword', 'text', 'param', 'unknown'] as const;

export const validate = (
  command: ESQLAstAllCommands,
  _ast: ESQLCommand[],
  context?: ICommandContext,
  _callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];
  const userAgentCommand = command as ESQLAstUserAgentCommand;
  const { expression, namedParameters } = userAgentCommand;

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
            type: 'keyword, text',
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
      // checks for regex_file and extract_device_type.
      const mapError = validateMap(namedParameters, USER_AGENT_MAP_DEFINITION);
      if (mapError) {
        messages.push(mapError);
      }
    }
  }

  return messages;
};
