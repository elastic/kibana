/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect } from 'react';
import { of } from 'rxjs';

const mockUseEffect = useEffect;
const mockOf = of;

const EDITOR_ID = 'testEditor';

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
    EuiResizeObserver: ({
      onResize,
      children,
    }: {
      onResize(data: { height: number }): void;
      children(): JSX.Element;
    }) => {
      onResize({ height: 1000 });
      return children();
    },
  };
});

jest.mock('@kbn/monaco', () => {
  const original = jest.requireActual('@kbn/monaco');
  const originalMonaco = original.monaco;

  return {
    ...original,
    PainlessLang: {
      ID: 'painless',
      getSuggestionProvider: () => undefined,
      getSyntaxErrors: () => ({
        [EDITOR_ID]: [],
      }),
      validation$() {
        return mockOf({ isValid: true, isValidating: false, errors: [] });
      },
    },
    monaco: {
      ...originalMonaco,
      editor: {
        ...originalMonaco.editor,
        setModelMarkers() {},
      },
    },
  };
});

jest.mock('react-use/lib/useDebounce', () => {
  return (cb: () => void, ms: number, deps: any[]) => {
    mockUseEffect(() => {
      cb();
    }, deps);
  };
});

jest.mock('../../../../kibana_react/public', () => {
  const original = jest.requireActual('../../../../kibana_react/public');

  /**
   * We mock the CodeEditor because it requires the <KibanaReactContextProvider>
   * with the uiSettings passed down. Let's use a simple <input /> in our tests.
   */
  const CodeEditorMock = (props: any) => {
    const { editorDidMount } = props;

    mockUseEffect(() => {
      // Forward our deterministic ID to the consumer
      // We need below for the PainlessLang.getSyntaxErrors mock
      editorDidMount({
        getModel() {
          return {
            id: EDITOR_ID,
          };
        },
      });
    }, [editorDidMount]);

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
    toMountPoint: (node: React.ReactNode) => node,
    CodeEditor: CodeEditorMock,
  };
});
