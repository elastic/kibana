/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { of } from 'rxjs';

const mockUseEffect = useEffect;
const mockOf = of;

const EDITOR_ID = 'testEditor';
const MONACO_MODULE = '@kbn/monaco';

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
          const typedValue = syntheticEvent.target.value;
          props.onChange([
            syntheticEvent['0'] ?? {
              value: typedValue,
              label: typedValue,
            },
          ]);
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
      mockUseEffect(() => {
        onResize({ height: 1000 });
      }, [onResize]);
      return children();
    },
  };
});

jest.doMock(MONACO_MODULE, () => {
  const original = jest.requireActual(MONACO_MODULE);
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

/**
 * By default the debounce is bypassed and the callback runs immediately, which keeps most tests
 * free from having to flush the debounce timers. Tests that need to reproduce a race between a
 * debounced request and a later parameter change can opt into the real timing with
 * setUseDebounceDelayed(true), and drive it with jest's fake timers.
 */
const useDebounceConfig = { delayed: false };
const mockUseDebounceConfig = useDebounceConfig;

export const setUseDebounceDelayed = (delayed: boolean) => {
  useDebounceConfig.delayed = delayed;
};

jest.mock('react-use/lib/useDebounce', () => {
  return (cb: () => void, ms: number, deps: any[]) => {
    mockUseEffect(() => {
      if (!mockUseDebounceConfig.delayed) {
        cb();
        return;
      }

      const timeoutId = setTimeout(cb, ms);

      return () => clearTimeout(timeoutId);
    }, deps);
  };
});

jest.mock('@kbn/code-editor', () => {
  const original = jest.requireActual('@kbn/code-editor');

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
