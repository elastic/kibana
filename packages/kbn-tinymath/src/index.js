/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const { get } = require('lodash');
const { parse: parseFn } = require('./grammar');
const { functions: includedFunctions } = require('./functions');

module.exports = { parse, evaluate, interpret };

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

function evaluate(expression, scope = {}, injectedFunctions = {}) {
  scope = scope || {};
  return interpret(parse(expression), scope, injectedFunctions);
}

function interpret(node, scope, injectedFunctions) {
  const functions = Object.assign({}, includedFunctions, injectedFunctions); // eslint-disable-line
  return exec(node);

  function exec(node) {
    const type = getType(node);

    if (type === 'function') return invoke(node);

    if (type === 'string') {
      const val = getValue(scope, node);
      if (typeof val === 'undefined') throw new Error(`Unknown variable: ${node}`);
      return val;
    }

    return node; // Can only be a number at this point
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

function getType(x) {
  const type = typeof x;
  if (type === 'object') {
    const keys = Object.keys(x);
    if (keys.length !== 2 || !x.name || !x.args) throw new Error('Invalid AST object');
    return 'function';
  }
  if (type === 'string' || type === 'number') return type;
  throw new Error(`Unknown AST property type: ${type}`);
}

function isOperable(args) {
  return args.every((arg) => {
    if (Array.isArray(arg)) return isOperable(arg);
    return typeof arg === 'number' && !isNaN(arg);
  });
}
