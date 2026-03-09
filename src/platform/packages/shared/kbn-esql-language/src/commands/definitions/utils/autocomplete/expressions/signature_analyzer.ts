/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLFunction } from '@elastic/esql/types';
import type { FunctionDefinition } from '../../../types';
import type { FunctionParameterContext } from './types';
import type { ICommandContext } from '../../../../registry/types';
import { EDITOR_MARKER } from '../../../constants';
import { resolveArgumentTypes } from '../../expressions';
import {
  getMatchingSignatures,
  getParamAtPosition,
  getParamDefsAtPosition,
} from '../../signature_analysis';

export function resolveSignatureContext(
  node: ESQLFunction,
  context: ICommandContext,
  fnDefinition: FunctionDefinition
): FunctionParameterContext | null {
  if (!fnDefinition) {
    return null;
  }

  const { argTypes, literalMask } = resolveArgumentTypes(node.args, {
    columns: context?.columns,
    unmappedFieldsStrategy: context?.unmappedFieldsStrategy,
  });

  const shouldGetNextArgument = node.text.includes(EDITOR_MARKER);
  let argIndex = Math.max(node.args.length, 0);
  if (!shouldGetNextArgument && argIndex) {
    argIndex -= 1;
  }

  const isVariadicFn = fnDefinition.signatures.some((sig) => sig.minParams != null);
  const hasMultipleSignatures = fnDefinition.signatures.length > 1;
  const argsToCheckForFiltering =
    isVariadicFn || shouldGetNextArgument || !hasMultipleSignatures ? argIndex : node.args.length;

  const validSignatures = getMatchingSignatures(
    fnDefinition.signatures,
    argTypes.slice(0, argsToCheckForFiltering),
    literalMask.slice(0, argsToCheckForFiltering),
    true,
    true
  );

  const compatibleParamDefs = getParamDefsAtPosition(
    getMatchingSignatures(
      fnDefinition.signatures,
      argTypes.slice(0, argIndex),
      literalMask.slice(0, argIndex),
      true,
      true
    ),
    argIndex
  );

  const hasMoreMandatoryArgs = !validSignatures.some((signature) => {
    const nextParam = getParamAtPosition(signature, argIndex + 1);

    return nextParam === null || nextParam?.optional === true;
  });

  const firstArgumentType = argTypes[0];
  const hasRepeating = fnDefinition.signatures.some((sig) => sig.isSignatureRepeating);
  const firstValueType = hasRepeating ? argTypes[1] : undefined;

  return {
    paramDefinitions: compatibleParamDefs,
    hasMoreMandatoryArgs,
    functionDefinition: fnDefinition,
    firstArgumentType,
    firstValueType,
    currentParameterIndex: argIndex,
    validSignatures,
  };
}
