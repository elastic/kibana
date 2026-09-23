/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isMap } from '@elastic/esql';
import type {
  ESQLAstAllCommands,
  ESQLAstIpLocationCommand,
  ESQLCommand,
} from '@elastic/esql/types';
import { validatePrefixAssignmentExpression } from '../../definitions/utils/validation/column';
import { validateMap, validateMapListParameter } from '../../definitions/utils/validation/map';
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

  messages.push(
    ...validatePrefixAssignmentExpression({
      expression,
      commandName: command.name,
      acceptedTypes: ACCEPTED_EXPRESSION_TYPES,
      typeLabel: 'ip, keyword, text',
      context,
    })
  );

  if (isMap(namedParameters)) {
    const listParameterError = validateMapListParameter(
      namedParameters,
      'properties',
      context?.columns,
      context?.unmappedFieldsStrategy
    );

    if (listParameterError) {
      messages.push(listParameterError);
    } else {
      const mapError = validateMap(namedParameters, IP_LOCATION_MAP_DEFINITION);
      if (mapError) {
        messages.push(mapError);
      }
    }
  }

  return messages;
};
