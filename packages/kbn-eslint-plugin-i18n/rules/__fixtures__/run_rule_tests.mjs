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
  formatted_message_should_start_with_the_right_id: () =>
    require('../formatted_message_should_start_with_the_right_id.cases.ts')
      .formattedMessageShouldStartWithTheRightIdCases,
  i18n_translate_should_start_with_the_right_id: () =>
    require('../i18n_translate_should_start_with_the_right_id.cases.ts')
      .i18nTranslateShouldStartWithTheRightIdCases,
  strings_should_be_translated_with_formatted_message: () =>
    require('../strings_should_be_translated_with_formatted_message.cases.ts')
      .stringsShouldBeTranslatedWithFormattedMessageCases,
  strings_should_be_translated_with_i18n: () =>
    require('../strings_should_be_translated_with_i18n.cases.ts')
      .stringsShouldBeTranslatedWithI18nCases,
};

RuleTester.describe = (_, fn) => fn();
RuleTester.it = (_, fn) => fn();
// The rules resolve i18n identifiers from file paths relative to `cwd`, the repository root here.
const ruleTester = new RuleTester({ cwd: process.cwd() });

for (const [ruleName, rule] of Object.entries(oxlintPlugin.rules)) {
  if (typeof rule.createOnce !== 'function') {
    throw new Error(`Oxlint plugin rule '${ruleName}' must use createOnce.`);
  }

  const getCases = ruleCases[ruleName];
  if (!getCases) {
    throw new Error(`Oxlint plugin rule '${ruleName}' has no test cases.`);
  }

  ruleTester.run(`@kbn/i18n/${ruleName}`, rule, getCases());
}
