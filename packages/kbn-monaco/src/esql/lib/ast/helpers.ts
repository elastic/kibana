/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '../../../monaco_imports';
import { builtinFunctions } from '../definitions/builtin';
import { mathCommandFullDefinitions } from '../definitions/functions';
import { FunctionDefinition } from '../definitions/types';
import { ESQLSingleAstItem } from './types';

type SignatureType = FunctionDefinition['signatures'][number];
type SignatureArgType = SignatureType['params'][number];

export function offsetToRowColumn(expression: string, offset: number): monaco.Position {
  const lines = expression.split(/\n/);
  let remainingChars = offset;
  let lineNumber = 1;
  for (const line of lines) {
    if (line.length >= remainingChars) {
      return new monaco.Position(lineNumber, remainingChars + 1);
    }
    remainingChars -= line.length + 1;
    lineNumber++;
  }

  throw new Error('Algorithm failure');
}

export function monacoPositionToOffset(expression: string, position: monaco.Position): number {
  const lines = expression.split(/\n/);
  return lines
    .slice(0, position.lineNumber)
    .reduce(
      (prev, current, index) =>
        prev + (index === position.lineNumber - 1 ? position.column - 1 : current.length + 1),
      0
    );
}

const fnLookups = builtinFunctions.concat(mathCommandFullDefinitions).reduce((memo, def) => {
  memo.set(def.name, def);
  return memo;
}, new Map<string, FunctionDefinition>());

export function isSupportedFunction(name: string, parentCommand?: string) {
  if (!parentCommand) {
    return false;
  }
  const fn = fnLookups.get(name);
  return Boolean(fn?.supportedCommands.includes(parentCommand));
}

export function getFunctionDefinition(name: string) {
  return fnLookups.get(name);
}

export function isEqualType(
  item: ESQLSingleAstItem,
  argType: SignatureArgType['type'],
  parentCommand?: string
) {
  const argTypes = Array.isArray(argType) ? argType : [argType];
  if (argTypes[0] === 'any') {
    return true;
  }
  if (item.type === 'literal') {
    return argTypes.includes(item.literalType);
  }
  if (item.type === 'list') {
    const listType = `${item.values[0].literalType}[]`;
    return argTypes.includes(listType);
  }
  if (item.type === 'function') {
    if (isSupportedFunction(item.name, parentCommand)) {
      const fnDef = fnLookups.get(item.name)!;
      return fnDef.signatures.some((signature) => argTypes.includes(signature.returnType));
    }
  }
  if (item.type === 'timeInterval') {
    return argTypes.includes('time_literal');
  }
  if (item.type === 'column') {
    return true; // will evaluate later on
  }
}
