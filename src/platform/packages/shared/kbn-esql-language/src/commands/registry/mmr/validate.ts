/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOptionNode } from '../../../ast/is';
import type {
  ESQLAstAllCommands,
  ESQLAstItem,
  ESQLAstMmrCommand,
  ESQLCommand,
  ESQLCommandOption,
  ESQLMessage,
} from '../../../types';
import type { ICommandContext } from '../types';
import { getExpressionType } from '../../definitions/utils/expressions';
import { getMessageFromId } from '../../definitions/utils/errors';
import { validateMap } from '../../definitions/utils/validation/map';
import { validateCommandArguments } from '../../definitions/utils/validation';

const MMR_WITH_MAP_DEFINITION =
  "{name='lambda', description='The relevance/diversity balancing factor', type=[double]}";

const getItemLocation = (item: ESQLAstItem | undefined, fallback: ESQLCommand['location']) => {
  if (!item) {
    return fallback;
  }

  if (Array.isArray(item)) {
    const firstNode = item[0];
    return firstNode && typeof firstNode === 'object' && 'location' in firstNode
      ? firstNode.location
      : fallback;
  }

  return item.location;
};

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLCommand[],
  context?: ICommandContext
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];
  const mmrCommand = command as ESQLAstMmrCommand;
  const queryVectorArg = mmrCommand.args.find((arg) => !Array.isArray(arg) && !isOptionNode(arg));
  const onOption = mmrCommand.args.find(
    (arg) => !Array.isArray(arg) && isOptionNode(arg) && arg.name.toLowerCase() === 'on'
  );
  const withOption = mmrCommand.args.find(
    (arg) => !Array.isArray(arg) && isOptionNode(arg) && arg.name.toLowerCase() === 'with'
  );

  const onFieldArg = (onOption as ESQLCommandOption)?.args[0];
  const optionsMap = (withOption as ESQLCommandOption)?.args[0];

  if (queryVectorArg) {
    const queryVectorType = getExpressionType(
      queryVectorArg,
      context?.columns,
      context?.unmappedFieldsStrategy
    );

    if (!['dense_vector', 'param', 'unknown'].includes(queryVectorType)) {
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

    if (!['dense_vector', 'param', 'unknown'].includes(diversifyFieldType)) {
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

  messages.push(...validateCommandArguments(command, ast, context));

  return messages;
};
