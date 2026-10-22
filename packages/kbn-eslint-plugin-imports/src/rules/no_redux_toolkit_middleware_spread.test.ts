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

for (const source of ['@reduxjs/toolkit', 'redux-toolkit-v1']) {
  const store = (body: string) =>
    `import { configureStore as store } from '${source}'; store({ middleware: (gDM) => ${body} });`;
  tester.run(`middleware spread (${source})`, rules.no_redux_toolkit_middleware_spread, {
    valid: [
      store('gDM().concat(custom)'),
      store('gDM().prepend(custom)'),
      store('[...custom]'),
      'store({middleware: gDM => [...gDM()]});',
      'rtk.configureStore({middleware: gDM => [...gDM()]});',
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
}
