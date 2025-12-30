/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WalkerAstNode } from '../../../../ast';
import { isLiteral, walk } from '../../../../ast';
import type { ESQLMessage } from '../../../../types';
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
      const castFunction = getFunctionForInlineCast(node.castType);
      if (!castFunction) {
        messages.push(errors.unknownCastingType(node.castType, node.location));
        return;
      }

      const castFunctionDef = getFunctionDefinition(castFunction);
      if (!castFunctionDef) {
        return;
      }
      const valueTypeBeforeCast = getExpressionType(node.value, context.columns);
      const matchingSignatures = getMatchingSignatures(
        castFunctionDef.signatures,
        [valueTypeBeforeCast],
        [isLiteral(node.value)],
        true // accepts unknown
      );
      if (matchingSignatures.length === 0) {
        messages.push(errors.invalidInlineCast(node.castType, valueTypeBeforeCast, node.location));
      }
    },
  });
  return messages;
}
