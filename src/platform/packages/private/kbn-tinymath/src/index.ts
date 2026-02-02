/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get } from 'lodash';
import memoizeOne from 'memoize-one';

import { functions as includedFunctions } from './functions';
import { parse as parseFn } from './grammar.peggy';

// Zero-indexed location
interface TinymathLocation {
  min: number;
  max: number;
}

interface TinymathFunction {
  type: 'function';
  name: string;
  args: TinymathAST[];
  location?: TinymathLocation;
  text?: string;
}

interface TinymathVariable {
  type: 'variable';
  value: string;
  text: string;
  location: TinymathLocation;
}

interface TinymathNamedArgument {
  type: 'namedArgument';
  name: string;
  value: string;
  text: string;
  location: TinymathLocation;
}

type TinymathAST = number | TinymathVariable | TinymathFunction | TinymathNamedArgument;

interface FunctionMap {
  [key: string]: (...args: any[]) => any;
}

function parse(input: string | null | undefined, options?: any): TinymathAST {
  if (input == null) {
    throw new Error('Missing expression');
  }

  if (typeof input !== 'string') {
    throw new Error('Expression must be a string');
  }

  try {
    return parseFn(input, options);
  } catch (e: any) {
    throw new Error(`Failed to parse expression. ${e.message}`);
  }
}

const memoizedParse = memoizeOne(parse);

export function evaluate(
  expression: string | null,
  scope: Record<string, any> = {},
  injectedFunctions: FunctionMap = {}
): number | number[] {
  scope = scope || {};
  return interpret(memoizedParse(expression), scope, injectedFunctions);
}

export function interpret(
  node: TinymathAST,
  scope: Record<string, any>,
  injectedFunctions: FunctionMap
): number | number[] {
  const functions = Object.assign({}, includedFunctions, injectedFunctions);
  return exec(node) as number | number[];

  function exec(astNode: TinymathAST): number | number[] | boolean | boolean[] {
    if (typeof astNode === 'number') {
      return astNode;
    }

    if (astNode.type === 'function') return invoke(astNode);

    if (astNode.type === 'variable') {
      const val = getValue(scope, astNode.value);
      if (typeof val === 'undefined') throw new Error(`Unknown variable: ${astNode.value}`);
      return val;
    }

    if (astNode.type === 'namedArgument') {
      // We are ignoring named arguments in the interpreter
      throw new Error(`Named arguments are not supported in tinymath itself, at ${astNode.name}`);
    }

    throw new Error(`Unknown node type: ${(astNode as any).type}`);
  }

  function invoke(
    fnNode: Extract<TinymathAST, { type: 'function' }>
  ): number | number[] | boolean | boolean[] {
    const { name, args } = fnNode;
    const fn = functions[name];
    if (!fn) throw new Error(`No such function: ${name}`);
    const execOutput = args.map(exec);
    if ((fn as any).skipNumberValidation || isOperable(execOutput)) return fn(...execOutput);
    return NaN;
  }
}

function getValue(scope: Record<string, any>, node: string): any {
  // attempt to read value from nested object first, check for exact match if value is undefined
  const val = get(scope, node);
  return typeof val !== 'undefined' ? val : scope[node];
}

function isOperable(args: any[]): boolean {
  return args.every((arg) => {
    if (Array.isArray(arg)) return isOperable(arg);
    return typeof arg === 'number' && !isNaN(arg);
  });
}

// ESM named exports
export { memoizedParse as parse };
