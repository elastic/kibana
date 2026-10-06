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
}

class CollectingRuleTester {
  run() {}
}

RuleTester.describe = (_, fn) => fn();
RuleTester.it = (_, fn) => fn();
global.describe = (_, fn) => fn();

const parityTests = {
  exports_moved_packages: () => require('../exports_moved_packages.test.ts'),
  no_boundary_crossing: () => require('../no_boundary_crossing.test.ts'),
  no_direct_handlebars_import: () => require('../no_direct_handlebars_import.test.ts'),
  no_direct_monaco_import: () => require('../no_direct_monaco_import.test.ts'),
  no_group_crossing_imports: () => require('../no_group_crossing_imports.test.ts'),
  no_group_crossing_manifests: () => require('../no_group_crossing_manifests.test.ts'),
  no_redux_toolkit_v2_imports: () => require('../no_redux_toolkit_v2_imports.test.ts'),
  no_undeclared_plugin_target: () => require('../no_undeclared_plugin_target.test.ts'),
  no_unresolvable_imports: () => require('../no_unresolvable_imports.test.ts'),
  no_unused_imports: () => require('../no_unused_imports.test.ts'),
  require_import: () => require('../require_import.test.ts'),
  uniform_imports: () => require('../uniform_imports.test.ts'),
};
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

for (const [ruleName, rule] of Object.entries(require('../../../oxlint_plugin').rules)) {
  if (typeof rule.createOnce !== 'function') {
    throw new Error(`Oxlint plugin rule '${ruleName}' must use createOnce.`);
  }
  if (!parityTests[ruleName]) {
    throw new Error(`Oxlint plugin rule '${ruleName}' has no parity test.`);
  }
}
resetModules();

// Jest hoists `jest.mock()` above a test file's imports, so mocks apply to the rules it loads.
// Without that hoisting the calls run too late, so each test file is loaded twice: once to collect
// its mock factories, then again with the mocked modules seeded into the require cache.
for (const [ruleName, loadTestFile] of Object.entries(parityTests)) {
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
  eslint.RuleTester = RuleTester;
  try {
    loadTestFile();
  } catch (error) {
    throw new Error(`Oxlint replay of the ${ruleName} tests failed`, { cause: error });
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
