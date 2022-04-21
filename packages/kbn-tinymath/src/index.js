/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { get } = require('lodash');
const memoizeOne = require('memoize-one');
const { functions: includedFunctions } = require('./functions');
const { parse: parseFn } = require('../grammar/built_grammar.js');

function parse(input, options) {
  if (input == null) {
    throw new Error('Missing expression');
  }

  if (typeof input !== 'string') {
    throw new Error('Expression must be a string');
  }

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
  const functions = Object.assign({}, includedFunctions, injectedFunctions); // eslint-disable-line
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

module.exports = { parse: memoizedParse, evaluate, interpret };
