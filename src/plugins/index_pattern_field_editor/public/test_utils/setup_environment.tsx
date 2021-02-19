/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

const EDITOR_ID = 'testEditor';

jest.mock('../../../kibana_react/public', () => {
  const original = jest.requireActual('../../../kibana_react/public');

  /**
   * We mock the CodeEditor because it requires the <KibanaReactContextProvider>
   * with the uiSettings passed down. Let's use a simple <input /> in our tests.
   */
  const CodeEditorMock = (props: any) => {
    // Forward our deterministic ID to the consumer
    // We need below for the PainlessLang.getSyntaxErrors mock
    props.editorDidMount({
      getModel() {
        return {
          id: EDITOR_ID,
        };
      },
    });

    return (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-value={props.value}
        value={props.value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          props.onChange(e.target.value);
        }}
      />
    );
  };

  return {
    ...original,
    CodeEditor: CodeEditorMock,
  };
});

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    EuiComboBox: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockComboBox'}
        data-currentvalue={props.selectedOptions}
        value={props.selectedOptions[0]?.value}
        onChange={async (syntheticEvent: any) => {
          props.onChange([syntheticEvent['0']]);
        }}
      />
    ),
  };
});

jest.mock('@kbn/monaco', () => {
  const original = jest.requireActual('@kbn/monaco');

  return {
    ...original,
    PainlessLang: {
      ID: 'painless',
      getSuggestionProvider: () => undefined,
      getSyntaxErrors: () => ({
        [EDITOR_ID]: [],
      }),
    },
  };
});
