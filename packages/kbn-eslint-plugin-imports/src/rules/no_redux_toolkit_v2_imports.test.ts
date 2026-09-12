/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleTester } from 'eslint';
import { NoReduxToolkitV2ImportsRule } from './no_redux_toolkit_v2_imports';

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

const msg = (v1: string, v2: string) =>
  `Import from "${v1}" instead of "${v2}". See dev_docs/contributing/redux_toolkit_v1_v2_migration.mdx for details.`;

ruleTester.run('@kbn/imports/no_redux_toolkit_v2_imports', NoReduxToolkitV2ImportsRule, {
  valid: [
    // v1 aliased imports are fine
    { code: `import { createSlice } from 'redux-toolkit-v1';` },
    { code: `import type { PayloadAction } from 'redux-toolkit-v1';` },
    { code: `import { useSelector } from 'react-redux-v7';` },
    { code: `import { produce } from 'immer-v9';` },
    { code: `import { createSelector } from 'reselect-v4';` },
    { code: `import redux from 'redux-v4';` },
    { code: `import thunk from 'redux-thunk-v2';` },
    // unrelated packages
    { code: `import { something } from 'redux-saga';` },
    { code: `import { something } from 'redux-actions';` },
    { code: `import { something } from 'redux-devtools-extension';` },
    // require with v1 alias
    { code: `const rtk = require('redux-toolkit-v1');` },
    // jest.mock with v1 alias
    { code: `jest.mock('react-redux-v7', () => ({ useSelector: jest.fn() }));` },
    { code: `jest.requireActual('redux-toolkit-v1');` },
    // infra files are skipped (tested via filename)
    {
      code: `import { configureStore } from '@reduxjs/toolkit';`,
      filename: '/packages/kbn-ui-shared-deps-src/src/entry.js',
    },
    {
      code: `import { configureStore } from '@reduxjs/toolkit';`,
      filename: '/packages/kbn-ui-shared-deps-npm/webpack.config.js',
    },
  ],

  invalid: [
    {
      code: `import { createSlice } from '@reduxjs/toolkit';`,
      errors: [{ message: msg('redux-toolkit-v1', '@reduxjs/toolkit') }],
      output: `import { createSlice } from 'redux-toolkit-v1';`,
    },
    {
      code: `import type { PayloadAction } from '@reduxjs/toolkit';`,
      errors: [{ message: msg('redux-toolkit-v1', '@reduxjs/toolkit') }],
      output: `import type { PayloadAction } from 'redux-toolkit-v1';`,
    },
    {
      code: `import { createApi } from '@reduxjs/toolkit/query';`,
      errors: [{ message: msg('redux-toolkit-v1', '@reduxjs/toolkit') }],
      output: `import { createApi } from 'redux-toolkit-v1/query';`,
    },
    {
      code: `import { useSelector } from 'react-redux';`,
      errors: [{ message: msg('react-redux-v7', 'react-redux') }],
      output: `import { useSelector } from 'react-redux-v7';`,
    },
    {
      code: `import { createStore } from 'redux';`,
      errors: [{ message: msg('redux-v4', 'redux') }],
      output: `import { createStore } from 'redux-v4';`,
    },
    {
      code: `import { produce } from 'immer';`,
      errors: [{ message: msg('immer-v9', 'immer') }],
      output: `import { produce } from 'immer-v9';`,
    },
    {
      code: `import { createSelector } from 'reselect';`,
      errors: [{ message: msg('reselect-v4', 'reselect') }],
      output: `import { createSelector } from 'reselect-v4';`,
    },
    {
      code: `import thunk from 'redux-thunk';`,
      errors: [{ message: msg('redux-thunk-v2', 'redux-thunk') }],
      output: `import thunk from 'redux-thunk-v2';`,
    },
    {
      code: `const redux = require('redux');`,
      errors: [{ message: msg('redux-v4', 'redux') }],
      output: `const redux = require('redux-v4');`,
    },
    {
      code: `jest.mock('react-redux', () => ({ useSelector: jest.fn() }));`,
      errors: [{ message: msg('react-redux-v7', 'react-redux') }],
      output: `jest.mock('react-redux-v7', () => ({ useSelector: jest.fn() }));`,
    },
    {
      code: `jest.requireActual('immer');`,
      errors: [{ message: msg('immer-v9', 'immer') }],
      output: `jest.requireActual('immer-v9');`,
    },
  ],
});
