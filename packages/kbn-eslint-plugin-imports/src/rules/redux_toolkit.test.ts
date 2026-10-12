/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleTester } from 'eslint';
import {
  NoReduxToolkitMiddlewareSpreadRule,
  NoReduxToolkitStateReassignmentRule,
} from './redux_toolkit';

const tester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { sourceType: 'module', ecmaVersion: 2020 },
});

for (const source of ['@reduxjs/toolkit', 'redux-toolkit-v1']) {
  const store = (body: string) =>
    `import { configureStore as store } from '${source}'; store({ middleware: (gDM) => ${body} });`;
  tester.run(`middleware spread (${source})`, NoReduxToolkitMiddlewareSpreadRule, {
    valid: [
      store('gDM().concat(custom)'),
      store('gDM().prepend(custom)'),
      store('[...custom]'),
      store('{ function nested(gDM) { return [...gDM()]; } return gDM(); }'),
      store('{ function nested() { return [...gDM()]; } return gDM(); }'),
      store('{ { const gDM = other; const list = [...gDM()]; } return []; }'),
      `import { configureStore } from 'other'; configureStore({middleware: gDM => [...gDM()]});`,
      `import { configureStore as store } from '${source}'; function f(store) { store({middleware: gDM => [...gDM()]}); }`,
    ],
    invalid: [
      { code: store('[...gDM(), custom]'), errors: [{ messageId: 'spread' }] },
      {
        code: store('{ return [...gDM({serializableCheck: false})]; }'),
        errors: [{ messageId: 'spread' }],
      },
      {
        code: `import * as rtk from '${source}'; rtk.configureStore({middleware: defaults => [...defaults()]});`,
        errors: [{ messageId: 'spread' }],
      },
    ],
  });

  const slice = (body: string) =>
    `import { createSlice as slice } from '${source}'; slice({name: 'test', initialState: {}, reducers: { reset(draft, action) { ${body} } }});`;
  tester.run(`draft reassignment (${source})`, NoReduxToolkitStateReassignmentRule, {
    valid: [
      slice('draft.value = action.payload;'),
      slice('return action.payload;'),
      slice('draft = action.payload; return draft;'),
      slice('if (action.payload) { draft.value = 1; return; } return {};'),
      slice('function nested(draft) { draft = {}; }'),
      slice('function nested() { draft = action.payload; }'),
      slice('{ let draft; draft = {}; }'),
      slice('return draft = action.payload;'),
      `import { createSlice } from 'other'; createSlice({reducers: {reset(state) {state = {};}}});`,
      `import { createSlice as slice } from '${source}'; function f(slice) { slice({reducers: {reset(state) {state = {};}}}); }`,
    ],
    invalid: [
      { code: slice('draft = action.payload;'), errors: [{ messageId: 'reassignment' }] },
      {
        code: slice('function helper() { return 1; } draft = action.payload;'),
        errors: [{ messageId: 'reassignment' }],
      },
      {
        code: slice('if (action.payload) { draft = {}; }'),
        errors: [{ messageId: 'reassignment' }],
      },
      {
        code: `import * as rtk from '${source}'; rtk.createSlice({reducers: {reset: {reducer(state) {state = {};}, prepare() {return {};}}}});`,
        errors: [{ messageId: 'reassignment' }],
      },
      {
        code: `import { createReducer } from '${source}'; createReducer({}, builder => builder.addCase(reset, state => {state = {};}).addMatcher(match, state => {state = {};}));`,
        errors: [{ messageId: 'reassignment' }, { messageId: 'reassignment' }],
      },
      {
        code: `import { createSlice } from '${source}'; createSlice({extraReducers: builder => {builder.addDefaultCase(state => {state = {};});}});`,
        errors: [{ messageId: 'reassignment' }],
      },
    ],
  });
}
