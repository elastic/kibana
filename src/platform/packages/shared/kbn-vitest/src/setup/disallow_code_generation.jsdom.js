/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// The node preset runs workers with --disallow-code-generation-from-strings. jsdom can't run under
// that flag: its selector engine (nwsapi) compiles every CSS selector with new Function(). In
// jest-environment-jsdom it ran in the outer realm, out of reach of the sandboxed eval/Function
// guard. Vitest has a single realm, so guard eval/Function here and exempt calls made directly by
// nwsapi. Same error as the V8 flag (and @kbn/jest's guard).

const ERROR_MESSAGE = 'Code generation from strings disallowed for this context';
// Only the immediate caller is checked: code under test that queries the DOM still has nwsapi
// frames somewhere below it, which must not exempt its own eval() calls.
const ALLOWED_CALLER =
  /[/\\]node_modules[/\\](?:\.pnpm[/\\][^/\\]+[/\\]node_modules[/\\])?nwsapi[/\\]/;
const THIS_FILE = /disallow_code_generation\.jsdom\.js/;

// Zod v4 compiles schemas with new Function() unless jitless is set before it loads.
global.__zod_globalConfig = Object.assign(global.__zod_globalConfig ?? {}, { jitless: true });

const isCallerAllowed = () => {
  const caller = new Error().stack
    .split('\n')
    .slice(1)
    .find((frame) => !THIS_FILE.test(frame));
  return caller !== undefined && ALLOWED_CALLER.test(caller);
};

// eslint-disable-next-line no-eval -- replacing eval to block code generation
const originalEval = global.eval;
// eslint-disable-next-line no-eval -- replacing eval to block code generation
global.eval = function (...args) {
  if (isCallerAllowed()) {
    return originalEval.apply(this, args);
  }
  throw new EvalError(ERROR_MESSAGE);
};

const OriginalFunction = global.Function;
const FunctionGuard = new Proxy(OriginalFunction, {
  apply(target, thisArg, args) {
    if (isCallerAllowed()) {
      return Reflect.apply(target, thisArg, args);
    }
    throw new EvalError(ERROR_MESSAGE);
  },
  construct(target, args, newTarget) {
    if (isCallerAllowed()) {
      return Reflect.construct(target, args, newTarget);
    }
    throw new EvalError(ERROR_MESSAGE);
  },
});
global.Function = FunctionGuard;
