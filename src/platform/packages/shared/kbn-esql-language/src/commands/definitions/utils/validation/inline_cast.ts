/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InlineCastingType } from '../../..';
import type { WalkerAstNode } from '../../../../ast';
import { isLiteral, walk } from '../../../../ast';
import type { ESQLInlineCast, ESQLMessage } from '../../../../types';
import type { ICommandContext } from '../../../registry/types';
import { errors } from '../errors';
import { getExpressionType, getMatchingSignatures } from '../expressions';
import { getFunctionDefinition, getFunctionForInlineCast } from '../functions';

/**
 * Validates inline casts within the given AST node.
 */
export function validateInlineCasts(
  astNode: WalkerAstNode,
  context: ICommandContext
): ESQLMessage[] {
  const messages: ESQLMessage[] = [];
  walk(astNode, {
    visitInlineCast: (node) => {
      const unknownCastingTypeError = checkUnknownCastingType(node);
      if (unknownCastingTypeError) {
        messages.push(unknownCastingTypeError);
        return;
      }

      const invalidCastValueError = checkInvalidCastValue(node, context);
      if (invalidCastValueError) {
        messages.push(invalidCastValueError);
      }
    },
  });
  return messages;
}

/**
 * Checks if the inline cast type is valid.
 * value:int -> OK
 * value:intt -> Error
 */
function checkUnknownCastingType(node: ESQLInlineCast) {
  const castFunction = getFunctionForInlineCast(node.castType as InlineCastingType);
  if (!castFunction) {
    return errors.unknownCastingType(node.castType, node.location);
  }
}

/**
 * Checks if the value being cast is compatible with the inline cast type.
 * To do this, we look for the function signature corresponding to the inline cast type.
 *
 * "2012"::date -> Ok
 * true::date -> Error
 */
function checkInvalidCastValue(node: ESQLInlineCast, context: ICommandContext) {
  const castFunction = getFunctionForInlineCast(node.castType as InlineCastingType);
  if (!castFunction) {
    return;
  }
  const castFunctionDef = getFunctionDefinition(castFunction);
  if (!castFunctionDef) {
    return;
  }

  const valueTypeBeforeCast = getExpressionType(
    node.value,
    context.columns,
    context.unmappedFieldsStrategy
  );

  const matchingSignatures = getMatchingSignatures(
    castFunctionDef.signatures,
    [valueTypeBeforeCast],
    [isLiteral(node.value)],
    true // accepts unknown
  );

  if (matchingSignatures.length === 0) {
    return errors.invalidInlineCast(node.castType, valueTypeBeforeCast, node.location);
  }
}
