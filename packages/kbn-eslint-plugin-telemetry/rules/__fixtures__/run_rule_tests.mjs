/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Runs outside Jest because `oxlint/plugins-dev` is ESM-only.
const { RuleTester } = await import('oxlint/plugins-dev');
const { createRequire } = await import('node:module');

const require = createRequire(import.meta.url);
// Loading the Oxlint entry registers the TypeScript transpiler used by the case modules below.
const oxlintPlugin = require('../../oxlint_plugin');

const ruleCases = {
  ebt_props_should_be_present: () =>
    require('../ebt_props_should_be_present.cases.ts').ebtPropsShouldBePresentCases,
  event_generating_elements_should_be_instrumented: () =>
    require('../event_generating_elements_should_be_instrumented.cases.ts')
      .eventGeneratingElementsShouldBeInstrumentedCases,
};

RuleTester.describe = (_, fn) => fn();
RuleTester.it = (_, fn) => fn();
// The rules derive app names from file paths relative to `cwd`, the repository root here.
const ruleTester = new RuleTester({ cwd: process.cwd() });

for (const [ruleName, rule] of Object.entries(oxlintPlugin.rules)) {
  if (typeof rule.createOnce !== 'function') {
    throw new Error(`Oxlint plugin rule '${ruleName}' must use createOnce.`);
  }

  const getCases = ruleCases[ruleName];
  if (!getCases) {
    throw new Error(`Oxlint plugin rule '${ruleName}' has no test cases.`);
  }

  ruleTester.run(`@kbn/telemetry/${ruleName}`, rule, getCases());
}
