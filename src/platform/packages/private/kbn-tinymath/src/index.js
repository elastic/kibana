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

const MAX_EXPRESSION_LENGTH = 1000;
const MAX_NESTING_DEPTH = 20;

// Matches single- and double-quoted strings, including escaped quotes (\' and \").
// Used to strip quoted spans before counting parenthesis nesting depth, so that
// parentheses inside KQL/Lucene filter strings (e.g. count(kql='(a or b)')) are
// not mistakenly counted as structural nesting.
const QUOTED_STRINGS_RE = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;

function checkNestingDepth(input) {
  const unquoted = input.replace(QUOTED_STRINGS_RE, '');
  let depth = 0;
  for (let i = 0; i < unquoted.length; i++) {
    if (unquoted[i] === '(') {
      if (++depth > MAX_NESTING_DEPTH) {
        throw new Error(`Expression exceeds maximum nesting depth of ${MAX_NESTING_DEPTH}`);
      }
    } else if (unquoted[i] === ')') {
      depth--;
    }
  }
}

function parse(input, options) {
  if (input == null) {
    throw new Error('Missing expression');
  }

  if (typeof input !== 'string') {
    throw new Error('Expression must be a string');
  }

  if (input.length > MAX_EXPRESSION_LENGTH) {
    throw new Error(`Expression exceeds maximum length of ${MAX_EXPRESSION_LENGTH} characters`);
  }

  checkNestingDepth(input);

  try {
    return parseFn(input, options);
  } catch (e) {
    throw new Error(`Failed to parse expression. ${e.message}`);
  }
}

const memoizedParse = memoizeOne(parse);

function evaluate(expression, scope = {}, injectedFunctions = {}) {
  scope = scope || {};
  return interpret(memoizedParse(expression), scope, injectedFunctions);
}

function interpret(node, scope, injectedFunctions) {
  const functions = Object.assign({}, includedFunctions, injectedFunctions); // eslint-disable-line prefer-object-spread
  return exec(node);

  function exec(node) {
    if (typeof node === 'number') {
      return node;
    }

    if (node.type === 'function') return invoke(node);

    if (node.type === 'variable') {
      const val = getValue(scope, node.value);
      if (typeof val === 'undefined') throw new Error(`Unknown variable: ${node.value}`);
      return val;
    }

    if (node.type === 'namedArgument') {
      // We are ignoring named arguments in the interpreter
      throw new Error(`Named arguments are not supported in tinymath itself, at ${node.name}`);
    }
  }

  function invoke(node) {
    const { name, args } = node;
    const fn = functions[name];
    if (!fn) throw new Error(`No such function: ${name}`);
    const execOutput = args.map(exec);
    if (fn.skipNumberValidation || isOperable(execOutput)) return fn(...execOutput);
    return NaN;
  }
}

function getValue(scope, node) {
  // attempt to read value from nested object first, check for exact match if value is undefined
  const val = get(scope, node);
  return typeof val !== 'undefined' ? val : scope[node];
}

function isOperable(args) {
  return args.every((arg) => {
    if (Array.isArray(arg)) return isOperable(arg);
    return typeof arg === 'number' && !isNaN(arg);
  });
}

export { memoizedParse as parse, evaluate, interpret };
