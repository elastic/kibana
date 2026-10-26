/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Runs outside Jest because `oxlint/plugins-dev` is ESM-only. Replays every case of the ESLint
// RuleTester suites in this directory through Oxlint's RuleTester.
const { RuleTester: OxlintRuleTester } = await import('oxlint/plugins-dev');
const { createRequire } = await import('node:module');

const require = createRequire(import.meta.url);
const eslint = require('eslint');
// The plugin and its test files are TypeScript, load them with the transpiler `oxlint_plugin.js` uses.
require('@kbn/swc-register').install();

// counts the `run()` calls of the replay so that a test file which never reaches it fails
let replayedRuns = 0;

class RuleTester extends OxlintRuleTester {
  constructor(config = {}) {
    const isTypeScript = String(config.parser).includes('@typescript-eslint/parser');
    const jsxSuffix = config.parserOptions?.ecmaFeatures?.jsx === true ? 'x' : '';
    super({
      eslintCompat: true,
      // ESLint's RuleTester hands `filename` to rules as written, Oxlint's joins relative ones to `cwd`
      cwd: '',
      languageOptions: {
        sourceType: config.parserOptions?.sourceType ?? 'module',
        parserOptions: { lang: isTypeScript ? `ts${jsxSuffix}` : 'js' },
      },
    });
  }

  run(...args) {
    replayedRuns++;
    return super.run(...args);
  }
}

class CollectingRuleTester {
  run() {}
}

RuleTester.describe = (_, fn) => fn();
RuleTester.it = (_, fn) => fn();
global.describe = (_, fn) => fn();

// every test file lives in `src/rules`, so their `jest.mock()` requests resolve from there
const testRequire = createRequire(new URL('../', import.meta.url));

// Like Jest's per-file module registry, every test file gets fresh copies of the modules it loads.
const preloaded = new Set(Object.keys(require.cache));
const resetModules = () => {
  for (const id of Object.keys(require.cache)) {
    if (!preloaded.has(id)) {
      delete require.cache[id];
    }
  }
};

const { rules } = require('../../../oxlint_plugin');
for (const [ruleName, rule] of Object.entries(rules)) {
  if (typeof rule.createOnce !== 'function') {
    throw new Error(`Oxlint plugin rule '${ruleName}' must use createOnce.`);
  }
}
resetModules();

// Jest hoists `jest.mock()` above a test file's imports, so mocks apply to the rules it loads.
// Without that hoisting the calls run too late, so each test file is loaded twice: once to collect
// its mock factories, then again with the mocked modules seeded into the require cache.
for (const ruleName of Object.keys(rules)) {
  const loadTestFile = () => testRequire(`./${ruleName}.test.ts`);
  const mocks = [];
  global.jest = {
    mock: (request, factory) => mocks.push({ id: testRequire.resolve(request), factory }),
    requireActual: (request) => testRequire(request),
  };
  eslint.RuleTester = CollectingRuleTester;
  loadTestFile();
  resetModules();

  const seeded = mocks.map(({ id, factory }) => ({ id, exports: factory() }));
  const replaced = seeded.map(({ id }) => ({ id, module: require.cache[id] }));
  for (const { id, exports } of seeded) {
    require.cache[id] = { id, filename: id, loaded: true, exports };
  }

  global.jest.mock = () => {};
  replayedRuns = 0;
  eslint.RuleTester = RuleTester;
  try {
    loadTestFile();
  } catch (error) {
    throw new Error(`Oxlint replay of the ${ruleName} tests failed`, { cause: error });
  }
  if (replayedRuns === 0) {
    throw new Error(`Oxlint replay of ${ruleName} ran no cases`);
  }
  resetModules();

  for (const { id, module } of replaced) {
    if (module) {
      require.cache[id] = module;
    } else {
      delete require.cache[id];
    }
  }
}
