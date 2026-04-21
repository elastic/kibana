/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOptionNode } from '@elastic/esql';
import type {
  ESQLAstAllCommands,
  ESQLAstItem,
  ESQLAstMmrCommand,
  ESQLCommand,
} from '@elastic/esql/types';
import { getExpressionType } from '../../definitions/utils/expressions';
import { getMessageFromId } from '../../definitions/utils/errors';
import { validateMap } from '../../definitions/utils/validation/map';
import { validateCommandArguments } from '../../definitions/utils/validation';
import type { ICommandCallbacks, ICommandContext } from '../types';
import { getItemLocation } from './utils';
import type { ESQLMessage } from '../../definitions/types';

const MMR_WITH_MAP_DEFINITION =
  "{name='lambda', description='The relevance/diversity balancing factor', type=[double]}";

const allowedVectorTypes = ['dense_vector', 'param', 'unknown'];

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLCommand[],
  context?: ICommandContext,
  callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];
  const mmrCommand = command as ESQLAstMmrCommand;
  let queryVectorArg: ESQLAstItem | undefined;
  let onFieldArg: ESQLAstItem | undefined;
  let optionsMap: ESQLAstItem | undefined;

  for (const arg of mmrCommand.args) {
    if (Array.isArray(arg)) continue;
    if (isOptionNode(arg)) {
      const name = arg.name.toLowerCase();
      if (name === 'on') onFieldArg = arg.args[0];
      else if (name === 'with') optionsMap = arg.args[0];
    } else if (!queryVectorArg) {
      queryVectorArg = arg;
    }
  }

  if (queryVectorArg) {
    const queryVectorType = getExpressionType(
      queryVectorArg,
      context?.columns,
      context?.unmappedFieldsStrategy
    );

    if (!allowedVectorTypes.includes(queryVectorType)) {
      messages.push(
        getMessageFromId({
          messageId: 'mmrQueryVectorWrongType',
          values: { type: queryVectorType },
          locations: getItemLocation(queryVectorArg, mmrCommand.location),
        })
      );
    }
  }

  if (onFieldArg) {
    const diversifyFieldType = getExpressionType(
      onFieldArg,
      context?.columns,
      context?.unmappedFieldsStrategy
    );

    if (!allowedVectorTypes.includes(diversifyFieldType)) {
      messages.push(
        getMessageFromId({
          messageId: 'mmrOnFieldWrongType',
          values: { type: diversifyFieldType },
          locations: getItemLocation(onFieldArg, mmrCommand.location),
        })
      );
    }
  }

  if (optionsMap && !Array.isArray(optionsMap)) {
    const mapValidationError = validateMap(optionsMap, MMR_WITH_MAP_DEFINITION);

    if (mapValidationError) {
      messages.push(mapValidationError);
    }
  }

  messages.push(...validateCommandArguments(command, ast, context, callbacks));

  return messages;
};
