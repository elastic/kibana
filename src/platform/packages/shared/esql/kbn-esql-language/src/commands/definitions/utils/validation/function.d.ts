/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAst, ESQLAstAllCommands, ESQLFunction } from '@elastic/esql/types';
import type { PromQLFunction } from '@elastic/esql';
import type { ICommandCallbacks, ICommandContext } from '../../../registry/types';
import type {
  ESQLMessage,
  PromQLFunctionDefinition,
  PromQLFunctionParamType,
  PromQLSignature,
} from '../../types';
export declare function validateFunction({
  fn,
  parentCommand,
  ast,
  context,
  callbacks,
}: {
  fn: ESQLFunction;
  parentCommand: ESQLAstAllCommands;
  ast: ESQLAst;
  context: ICommandContext;
  callbacks: ICommandCallbacks;
}): ESQLMessage[];
export declare function getPromqlFunctionArityCheck(
  fn: PromQLFunction,
  definition: PromQLFunctionDefinition
): {
  expected: string;
  actual: number;
} | null;
export declare function getPromqlMatchingSignatures(
  signatures: PromQLSignature[],
  argTypes: (PromQLFunctionParamType | undefined)[]
): PromQLSignature[];
export declare function getPromqlSignatureMismatch(
  signatures: PromQLSignature[],
  argTypes: (PromQLFunctionParamType | undefined)[],
  argCount: number
): {
  required: string;
  mismatchIdx: number;
} | null;
