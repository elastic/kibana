/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

// NOTE: Import this file for its side-effects. You must import it before the code that it mocks
// is imported. Typically this means just importing above your other imports.
// See https://jestjs.io/docs/manual-mocks for more info.

// This mocks any direct imports of EuiCodeEditor, e.g. by JsonEditor.
jest.mock('.', () => {
  const original = jest.requireActual('.');

  return {
    ...original,
    // Mock EuiCodeEditor, which uses React Ace under the hood.
    EuiCodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-currentvalue={props.value}
        onChange={(syntheticEvent: any) => {
          props.onChange(syntheticEvent.jsonString);
        }}
      />
    ),
  };
});
