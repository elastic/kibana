/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleTester } from 'eslint';
import { NoDirectHandlebarsImportRule } from './no_direct_handlebars_import';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
    ecmaFeatures: {
      jsx: true,
    },
  },
});

ruleTester.run('@kbn/imports/no_direct_handlebars_import', NoDirectHandlebarsImportRule, {
  valid: [
    {
      code: 'import Handlebars from "@kbn/handlebars";',
    },
    {
      code: 'import { compile } from "@kbn/handlebars";',
    },
    {
      code: 'import * as Handlebars from "@kbn/handlebars";',
    },
    {
      code: 'import something from "other-package";',
    },
    {
      code: 'const foo = require("@kbn/handlebars");',
    },
  ],

  invalid: [
    {
      code: 'import Handlebars from "handlebars";',
      errors: [
        {
          message:
            'Do not import directly from "handlebars". Use the custom Handlebars from "@kbn/handlebars" instead.',
        },
      ],
      output: "import Handlebars from '@kbn/handlebars';",
    },
    {
      code: 'import { compile } from "handlebars";',
      errors: [
        {
          message:
            'Do not import directly from "handlebars". Use the custom Handlebars from "@kbn/handlebars" instead.',
        },
      ],
      output: "import { compile } from '@kbn/handlebars';",
    },
    {
      code: 'import * as Handlebars from "handlebars";',
      errors: [
        {
          message:
            'Do not import directly from "handlebars". Use the custom Handlebars from "@kbn/handlebars" instead.',
        },
      ],
      output: "import * as Handlebars from '@kbn/handlebars';",
    },
    {
      code: 'import "handlebars/lib/handlebars";',
      errors: [
        {
          message:
            'Do not import directly from "handlebars". Use the custom Handlebars from "@kbn/handlebars" instead.',
        },
      ],
      output: "import '@kbn/handlebars/lib/handlebars';",
    },
    {
      code: 'const Handlebars = require("handlebars");',
      errors: [
        {
          message:
            'Do not import directly from "handlebars". Use the custom Handlebars from "@kbn/handlebars" instead.',
        },
      ],
      output: "const Handlebars = require('@kbn/handlebars');",
    },
  ],
});
