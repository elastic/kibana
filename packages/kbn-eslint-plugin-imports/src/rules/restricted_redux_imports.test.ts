/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleTester } from 'eslint';
import { rules } from '../..';

const tester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { sourceType: 'module', ecmaVersion: 2020 },
});

const options = [
  {
    paths: ['redux', 'redux-v4'].map((name) => ({
      name,
      importNames: ['createStore', 'legacy_createStore'],
      message: 'Prefer configureStore from the matching Redux Toolkit package.',
    })),
  },
];

for (const source of ['redux', 'redux-v4']) {
  tester.run(`restricted Redux imports (${source})`, rules.restricted_redux_imports, {
    valid: [
      { code: `import { combineReducers, applyMiddleware } from '${source}';`, options },
      { code: `import type { Store, Dispatch } from '${source}';`, options },
      { code: `export { combineReducers } from '${source}';`, options },
      {
        code: `import { configureStore, createReducer, createAction } from '@reduxjs/toolkit';`,
        options,
      },
      {
        code: `import { configureStore, createReducer, createAction } from 'redux-toolkit-v1';`,
        options,
      },
      { code: `import { createStore } from 'other';`, options },
    ],
    invalid: [
      { code: `import { createStore } from '${source}';`, options, errors: 1 },
      {
        code: `import { legacy_createStore as createStore } from '${source}';`,
        options,
        errors: 1,
      },
      { code: `import { createStore as store } from '${source}';`, options, errors: 1 },
      { code: `export { createStore } from '${source}';`, options, errors: 1 },
      { code: `export { legacy_createStore as store } from '${source}';`, options, errors: 1 },
      { code: `import * as redux from '${source}';`, options, errors: 1 },
      { code: `export * from '${source}';`, options, errors: 1 },
      {
        code: `import { createStore, legacy_createStore } from '${source}';`,
        options,
        errors: 2,
      },
    ],
  });
}
