/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DummyRuleMap, OxlintOverride } from 'oxlint';

// copied from https://github.com/facebookincubator/create-react-app/blob/2e82ebb3371731a5c4e346f310848ddb23fd0976/packages/eslint-config-react-app/index.js#L24
export const RESTRICTED_GLOBALS = [
  'addEventListener',
  'blur',
  'close',
  'closed',
  'confirm',
  'defaultStatus',
  'defaultstatus',
  'event',
  'external',
  'find',
  'focus',
  'frameElement',
  'frames',
  'history',
  'innerHeight',
  'innerWidth',
  'length',
  'location',
  'locationbar',
  'menubar',
  'moveBy',
  'moveTo',
  'name',
  'onblur',
  'onerror',
  'onfocus',
  'onload',
  'onresize',
  'onunload',
  'open',
  'opener',
  'opera',
  'outerHeight',
  'outerWidth',
  'pageXOffset',
  'pageYOffset',
  'parent',
  'print',
  'removeEventListener',
  'resizeBy',
  'resizeTo',
  'screen',
  'screenLeft',
  'screenTop',
  'screenX',
  'screenY',
  'scroll',
  'scrollbars',
  'scrollBy',
  'scrollTo',
  'scrollX',
  'scrollY',
  'self',
  'status',
  'statusbar',
  'stop',
  'toolbar',
  'top',
];

/** Rules `@kbn/eslint-config` applied to every file. */
export const kbnConfigRules: DummyRuleMap = {
  'no-new-func': 'error',
  'no-implied-eval': 'error',
  'no-prototype-builtins': 'error',
};

export const javascriptRules: DummyRuleMap = {
  'dot-notation': ['error', { allowKeywords: true }],
  'block-scoped-var': 'error',
  // 'camelcase': ['error', { 'properties': 'never', 'allow': ['^UNSAFE_'] }],
  'consistent-return': 'off',
  'constructor-super': 'error',
  // '@eslint-community/eslint-comments/no-unused-disable': 'error',
  // '@eslint-community/eslint-comments/no-unused-enable': 'error',
  'guard-for-in': 'error',
  // 'import/order': [
  //   'error',
  //   {
  //     'groups': [['external', 'builtin'], 'internal', ['parent', 'sibling', 'index']]
  //   }
  // ],

  // 'mocha/handle-done-callback': 'error',
  // 'mocha/no-exclusive-tests': 'error',
  'no-caller': 'error',
  'no-cond-assign': 'error',
  'no-const-assign': 'error',
  'no-debugger': 'error',
  'no-empty': 'error',
  'no-eval': 'error',
  'no-extend-native': 'error',
  'no-iterator': 'error',
  // 'no-multi-str': 'error',
  // 'no-new': 'error',
  'no-new-wrappers': 'error',
  // 'no-path-concat': 'error',
  // 'no-restricted-imports': [2, RESTRICTED_MODULES],
  // 'no-restricted-modules': [2, RESTRICTED_MODULES],
  // 'no-restricted-syntax': [
  //   'error',
  //   {
  //     'selector': 'TSEnumDeclaration[const=true]',
  //     'message': 'Do not use `const` with enum declarations'
  //   }
  // ],
  // 'no-return-assign': 'error',
  'no-script-url': 'error',
  // 'no-undef': 'error',
  // 'no-undef-init': 'error',
  'no-underscore-dangle': 'off',
  // 'no-unsanitized/method': 'error',
  // 'no-unsanitized/property': 'error',
  'no-unused-labels': 'error',
  'no-with': 'error',

  // 'spaced-comment': [
  //   'error',
  //   'always',
  //   {
  //     'exceptions': ['/']
  //   }
  // ],
  // 'strict': ['error', 'never'],
  'use-isnan': 'error',
  // 'yoda': 'off',
};

/** `@kbn/eslint-config`'s JavaScript-only rules. */
export const javascriptOverrides: OxlintOverride[] = [
  {
    files: ['**/*.js', '**/*.mjs'],
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'new-cap': ['error', { capIsNewExceptions: ['Private'] }],
      'no-global-assign': 'error',
      'no-irregular-whitespace': 'error',
      'no-loop-func': 'error',
      'no-nested-ternary': 'error',
      'no-proto': 'error',
      'no-redeclare': 'error',
      'no-restricted-globals': ['error', ...RESTRICTED_GLOBALS],
      'no-sequences': 'error',
      'no-use-before-define': ['error', 'nofunc'],
      'no-var': 'error',
      'one-var': ['error', 'never'],
      'prefer-const': 'error',
      'valid-typeof': 'error',
      'prefer-object-spread': 'error',
    },
  },
];
