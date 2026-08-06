/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Disallow runtime code generation from strings in Jest tests.
 *
 * In production and dev mode, Kibana runs with the V8 flag
 * --disallow-code-generation-from-strings, which causes eval() and
 * new Function(string) to throw:
 *
 *   "Code generation from strings disallowed for this context"
 *
 * We cannot use that V8 flag for Jest because Jest's own dependencies
 * (tmpl -> makeerror -> walker) call new Function() during startup.
 * Instead, this setup file replaces eval and Function with versions that
 * throw the same EvalError, scoped to the test sandbox only.
 *
 * Jest's own mock system (jest-mock) uses new Function() to create mock
 * functions that preserve the original function's name. These calls are
 * exempted by checking the call stack for known Jest internal callers.
 *
 * If your test is failing with this error, it means the code under test
 * uses eval() or new Function() — which would also fail in production.
 * Fix the underlying code rather than removing this restriction.
 *
 * See: packages/kbn-cli-dev-mode/src/using_server_process.ts  (dev flag)
 *      src/dev/build/tasks/bin/scripts/kibana                  (prod flag)
 *      src/platform/packages/shared/kbn-security-hardening/    (hardening package)
 */

const ERROR_MESSAGE = 'Code generation from strings disallowed for this context';

// Zod v4 has a JIT compiler that uses new Function() for schema parsing.
// Setting jitless on the backing store ensures Zod skips JIT regardless of
// import order. Zod's own allowsEval probe is unreliable here because module
// caching can cause it to run before our Function proxy is installed.
global.__zod_globalConfig = Object.assign(global.__zod_globalConfig || {}, { jitless: true });

const ALLOWED_CALLERS = [
  // ESLint's ajv plugin uses new Function() for schema parsing. Dev-only, this is OK.
  /eslint.*ajv/,
  // i18n_eui_mapping.test.ts intentionally uses eval within its harness. Dev-only, this is OK.
  /i18n_eui_mapping.*\.test/,
  // Jest's own mock system (jest-mock) uses new Function() to create mock. Dev-only, this is OK.
  /jest-mock/,
  // Jest's own runtime uses new Function() for code generation. Dev-only, this is OK.
  /jest-runtime/,
  // Jest's own snapshot system uses new Function() for code generation. Dev-only, this is OK.
  /jest-snapshot/,
  // Jest's own environment uses new Function() for code generation. Dev-only, this is OK.
  /jest-environment/,
  // kbn-handlebars tests intentionally exercise the eval-based Handlebars compiler
  // to verify parity with the safe AST-based replacement. The CSP probe
  // (kbnUnsafeEvalTest) is blocked separately above, so this exception only
  // affects the actual parity-test compilation calls.
  /kbn-handlebars.*test/,
  // hmr_client.test uses new Function() to load a browser bundle with injected globals;
  // the bundle itself does not use code generation in production.
  /kbn-rspack-optimizer.*hmr_client\.test/,
];

// @kbn/handlebars probes for CSP unsafe-eval support by calling
// new Function('kbnUnsafeEvalTest', 'return true;'). In Jest the jest-runtime
// allow-list entry would let this probe succeed (jest-runtime is in the stack
// during module loading), causing handlebars to pick the eval-based compiler
// that later fails. Blocking the probe explicitly makes the Jest environment
// match browser CSP behavior, routing to the safe compileAST path.
const CSP_PROBE_MARKER = 'kbnUnsafeEvalTest';

function isCspProbe(args) {
  return args.length > 0 && args[0] === CSP_PROBE_MARKER;
}

function isCallerAllowed() {
  const stack = new Error().stack || '';
  return ALLOWED_CALLERS.some((pattern) => pattern.test(stack));
}

// eslint-disable-next-line no-eval -- intentionally replacing eval to block code generation
const OriginalEval = global.eval;

// eslint-disable-next-line no-eval -- intentionally replacing eval to block code generation
global.eval = function () {
  if (isCallerAllowed()) {
    return OriginalEval.apply(this, arguments);
  }
  throw new EvalError(ERROR_MESSAGE);
};

const OriginalFunction = global.Function;
const FunctionProxy = new Proxy(OriginalFunction, {
  apply(target, thisArg, args) {
    if (!isCspProbe(args) && isCallerAllowed()) {
      return Reflect.apply(target, thisArg, args);
    }
    throw new EvalError(ERROR_MESSAGE);
  },
  construct(target, args, newTarget) {
    if (!isCspProbe(args) && isCallerAllowed()) {
      return Reflect.construct(target, args, newTarget);
    }
    throw new EvalError(ERROR_MESSAGE);
  },
});

Object.defineProperty(FunctionProxy, 'prototype', {
  value: OriginalFunction.prototype,
  writable: false,
});

global.Function = FunctionProxy;
