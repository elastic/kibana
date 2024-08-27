/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { RuleTester } = require('eslint');
const rule = require('./no_unsafe_js_yaml');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
  },
});

ruleTester.run('no_unsafe_js_yaml', rule, {
  valid: [
    "import { safeLoad } from 'js-yaml'; const data = safeLoad(yamlString);",
    "import { safeDump } from 'js-yaml'; const yaml = safeDump(data);",
    "import * as yaml from 'js-yaml'; const data = yaml.safeLoad(yamlString);",
    "import yaml from 'js-yaml'; yaml.safeLoad('yamlString');",
  ],
  invalid: [
    {
      code: "import { load } from 'js-yaml'; const data = load(yamlString);",
      errors: [
        {
          message:
            'Use `safeLoad` instead of `load` and `safeDump` instead of `dump` from `js-yaml`.',
          line: 1,
          column: 10,
          endLine: 1,
          endColumn: 14,
        },
        {
          message:
            'Use `safeLoad` instead of `load` and `safeDump` instead of `dump` from `js-yaml`.',
          line: 1,
          column: 46,
          endLine: 1,
          endColumn: 50,
        },
      ],
      output: "import { safeLoad } from 'js-yaml'; const data = safeLoad(yamlString);",
    },
    {
      code: "import { dump } from 'js-yaml'; const yaml = dump(data);",
      errors: [
        {
          message:
            'Use `safeLoad` instead of `load` and `safeDump` instead of `dump` from `js-yaml`.',
          line: 1,
          column: 10,
          endLine: 1,
          endColumn: 14,
        },
        {
          message:
            'Use `safeLoad` instead of `load` and `safeDump` instead of `dump` from `js-yaml`.',
          line: 1,
          column: 46,
          endLine: 1,
          endColumn: 50,
        },
      ],
      output: "import { safeDump } from 'js-yaml'; const yaml = safeDump(data);",
    },
    {
      code: "import * as yaml from 'js-yaml'; const data = yaml.load(yamlString);",
      errors: [
        {
          message:
            'Use `safeLoad` instead of `load` and `safeDump` instead of `dump` from `js-yaml`.',
        },
      ],
      output: "import * as yaml from 'js-yaml'; const data = yaml.safeLoad(yamlString);",
    },
    {
      code: "import yaml from 'js-yaml'; yaml.load('someYAMLContent')",
      errors: [
        {
          message:
            'Use `safeLoad` instead of `load` and `safeDump` instead of `dump` from `js-yaml`.',
        },
      ],
      output: "import yaml from 'js-yaml'; yaml.safeLoad('someYAMLContent')",
    },
    {
      code: "import yaml, { safeDump } from 'js-yaml'; safeDump(data); yaml.load('someYAMLContent');",
      errors: [
        {
          message:
            'Use `safeLoad` instead of `load` and `safeDump` instead of `dump` from `js-yaml`.',
        },
      ],
      output:
        "import yaml, { safeDump } from 'js-yaml'; safeDump(data); yaml.safeLoad('someYAMLContent');",
    },
  ],
});
