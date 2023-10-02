/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '../../../monaco_imports';
import { statsAggregationFunctionDefinitions } from './definitions/aggs';
import { builtinFunctions } from './definitions/builtin';
import { commandDefinitions } from './definitions/commands';
import { evalFunctionsDefinitions } from './definitions/functions';
import { CommandDefinition, FunctionDefinition } from './definitions/types';
import { ESQLLiteral, ESQLSingleAstItem } from './types';

type SignatureType = FunctionDefinition['signatures'][number];
type SignatureArgType = SignatureType['params'][number];

// from linear offset to Monaco position
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

// From Monaco position to linear offset
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

let fnLookups: Map<string, FunctionDefinition> | undefined;
let commandLookups: Map<string, CommandDefinition> | undefined;

function buildFunctionLookup() {
  if (!fnLookups) {
    fnLookups = builtinFunctions
      .concat(evalFunctionsDefinitions, statsAggregationFunctionDefinitions)
      .reduce((memo, def) => {
        memo.set(def.name, def);
        return memo;
      }, new Map<string, FunctionDefinition>());
  }
  return fnLookups;
}

type ReasonTypes = 'missingCommand' | 'unsupportedFunction' | 'unknownFunction';

export function isSupportedFunction(
  name: string,
  parentCommand?: string
): { supported: boolean; reason: ReasonTypes | undefined } {
  if (!parentCommand) {
    return {
      supported: false,
      reason: 'missingCommand',
    };
  }
  const fn = buildFunctionLookup().get(name);
  const isSupported = Boolean(fn?.supportedCommands.includes(parentCommand));
  return {
    supported: isSupported,
    reason: isSupported ? undefined : fn ? 'unsupportedFunction' : 'unknownFunction',
  };
}

export function getFunctionDefinition(name: string) {
  return buildFunctionLookup().get(name.toLowerCase());
}

function buildCommandLookup() {
  if (!commandLookups) {
    commandLookups = commandDefinitions.reduce((memo, def) => {
      memo.set(def.name, def);
      if (def.alias) {
        memo.set(def.alias, def);
      }
      return memo;
    }, new Map<string, CommandDefinition>());
  }
  return commandLookups;
}

export function getCommandDefinition(name: string): CommandDefinition {
  return buildCommandLookup().get(name.toLowerCase())!;
}

function compareLiteralType(argTypes: string[], type: ESQLLiteral['literalType']) {
  if (type !== 'string') {
    return argTypes.includes(type);
  }
  const hasLiteralTypes = argTypes.some((t) => /literal$/.test(t));
  return hasLiteralTypes;
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
    return compareLiteralType(argTypes, item.literalType);
  }
  if (item.type === 'list') {
    const listType = `${item.values[0].literalType}[]`;
    return argTypes.includes(listType);
  }
  if (item.type === 'function') {
    if (isSupportedFunction(item.name, parentCommand).supported) {
      const fnDef = buildFunctionLookup().get(item.name)!;
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
