/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester: OxlintRuleTester } = await import('oxlint/plugins-dev');
const { createRequire } = await import('node:module');

const require = createRequire(import.meta.url);
const eslint = require('eslint');

class RuleTester extends OxlintRuleTester {
  constructor(config = {}) {
    const isTypeScript = String(config.parser).includes('@typescript-eslint/parser');
    super({
      eslintCompat: true,
      languageOptions: {
        sourceType: config.parserOptions?.sourceType ?? 'module',
        parserOptions: { lang: isTypeScript ? 'ts' : 'js' },
      },
    });
  }
}

RuleTester.describe = (_, fn) => fn();
RuleTester.it = (_, fn) => fn();
eslint.RuleTester = RuleTester;

require('../no_async_promise_body.test.js');
require('../no_async_foreach.test.js');
require('../no_conditional_saved_object_type_registration.test.js');
require('../no_constructor_args_in_property_initializers.test.js');
require('../no_this_in_property_initializers.test.js');
require('../no_trailing_import_slash.test.js');
require('../no_unsafe_console.test.js');
require('../require_kibana_feature_privileges_naming.test.js');
