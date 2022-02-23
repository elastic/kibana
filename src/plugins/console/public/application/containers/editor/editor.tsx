/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, memo, useEffect, useMemo } from 'react';
import { Cancelable, debounce } from 'lodash';
import { EuiProgress } from '@elastic/eui';

import MonacoEditor from 'react-monaco-editor';
import { monaco } from '@kbn/monaco';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiScreenReaderOnly,
  EuiToolTip,
} from '@elastic/eui';
// import { CodeEditor } from '../../../../../kibana_react/public';
import { Lang } from './hjson';
import { EditorContentSpinner } from '../../components';
import { Panel, PanelsContainer } from '../../containers';
import { EditorOutput } from './legacy/console_editor';
// import { Editor as EditorUI, EditorOutput } from './legacy/console_editor';
import { StorageKeys } from '../../../services';
import {
  useEditorReadContext,
  useServicesContext,
  useRequestReadContext,
  useRequestActionContext,
} from '../../contexts';
import { sendRequestToES } from '../../hooks/use_send_current_request_to_es/send_request_to_es';
import { Actions } from '../../stores/request';
import { useSaveCurrentTextObject } from '../../hooks/use_save_current_text_object';

const INITIAL_PANEL_WIDTH = 50;
const PANEL_MIN_WIDTH = '100px';

const LANGUAGE = 'hjson';

interface APIShape {
  items: Array<{
    text: string;
  }>;
}

interface Items {
  items: Array<{ text: string }>;
}

export const items: Items = {
  items: [],
};

export const emptyItems: Items = {
  items: [],
};

interface Props {
  loading: boolean;
}

// muuhahahaa, muhahahaha. Global state, suckers.
let globalText = '';

export const Editor = memo(({ loading }: Props) => {
  const {
    services: { storage, notifications },
  } = useServicesContext();
  const dispatch = useRequestActionContext();
  const saveCurrentTextObject = useSaveCurrentTextObject();

  const { currentTextObject } = useEditorReadContext();
  const { requestInFlight } = useRequestReadContext();

  const [firstPanelWidth, secondPanelWidth] = storage.get(StorageKeys.WIDTH, [
    INITIAL_PANEL_WIDTH,
    INITIAL_PANEL_WIDTH,
  ]);

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const onPanelWidthChange = useCallback(
    debounce((widths: number[]) => {
      storage.set(StorageKeys.WIDTH, widths);
    }, 300),
    []
  );

  if (!currentTextObject) return null;
  if (globalText === '') {
    globalText = currentTextObject.text;
  }
  return (
    <>
      {requestInFlight ? (
        <div className="conApp__requestProgressBarContainer">
          <EuiProgress size="xs" color="accent" position="absolute" />
        </div>
      ) : null}
      <PanelsContainer onPanelWidthChange={onPanelWidthChange} resizerClassName="conApp__resizer">
        <Panel
          style={{ height: '100%', position: 'relative', minWidth: PANEL_MIN_WIDTH }}
          initialWidth={firstPanelWidth}
        >
          {loading ? (
            <EditorContentSpinner />
          ) : (
            <>
              <EuiFlexGroup
                className="conApp__editorActions"
                id="ConAppEditorActions"
                gutterSize="none"
                responsive={false}
              >
                <EuiFlexItem />
              </EuiFlexGroup>
              <MonacoEditor
                value={globalText}
                editorDidMount={getHandleEditorDidMount(dispatch, saveCurrentTextObject)}
                language={LANGUAGE}
                height={'100vh'}
                width={'100vh'}
                options={{
                  matchBrackets: 'never',
                  minimap: {
                    enabled: false,
                  },
                  lineHeight: 21,
                  fontSize: 14,
                  // fontFamily: 'Roboto Mono',
                  inlineSuggest: {
                    enabled: true,
                  },
                }}
              />
            </>
          )}
        </Panel>
        <Panel
          style={{ height: '100%', position: 'relative', minWidth: PANEL_MIN_WIDTH }}
          initialWidth={secondPanelWidth}
        >
          {loading ? <EditorContentSpinner /> : <EditorOutput />}
        </Panel>
      </PanelsContainer>
    </>
  );
});

export const getHandleEditorDidMount = (
  dispatch: React.Dispatch<Actions>,
  saveCurrentTextObject: ((text: string) => void) & Cancelable
) => {
  const handleEditorDidMount = (
    editor: monaco.editor.IStandaloneCodeEditor,
    localMonaco: typeof monaco
  ) => {
    function setupAutosave() {
      let timer: number;
      const saveDelay = 500;

      editor.getModel()?.onDidChangeContent((event) => {
        if (timer) {
          clearTimeout(timer);
        }
        timer = window.setTimeout(saveCurrentState, saveDelay);
      });
    }

    function saveCurrentState() {
      try {
        const content = editor.getModel()?.getValue();
        if (content != null) {
          globalText = content;
          saveCurrentTextObject(content);
        }
      } catch (e) {
        // Ignoring saving error
      }
    }
    setupAutosave();
    // eslint-disable-next-line no-bitwise
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, async () => {
      console.log('Ctrl + Enter happened');
      const model = editor.getModel();
      const position = editor.getPosition();
      dispatch({ type: 'sendRequest', payload: undefined });
      if (model != null && position != null) {
        await expandRangeToRequestEdges(model, position, dispatch);
      }
    });

    monaco.languages.register({
      id: Lang.ID,
    });
    monaco.languages.setMonarchTokensProvider(Lang.ID, Lang.lexerRules);
    if (Lang.languageConfiguration) {
      monaco.languages.setLanguageConfiguration(Lang.ID, Lang.languageConfiguration);
    }

    monaco.languages.registerInlineCompletionsProvider(`${LANGUAGE}`, {
      provideInlineCompletions: (model, position, context, token) => {
        const textAbove = model.getValueInRange({
          startLineNumber: position.lineNumber - 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: 999,
        });
        const currentLine = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: 999,
        });
        // console.log('text above is:', textAbove);
        // console.log('currentLine is:', textAbove);
        // console.log('All text is:', textUntilPosition);
        if (currentLine.startsWith('#')) {
          // console.log('Text is comment');
          debouncedProvideInlineCompletions(model, position);
          return emptyItems;
        } else if (
          currentLine.startsWith('') &&
          (textAbove.startsWith('#') ||
            textAbove.startsWith('GET ') ||
            textAbove.startsWith('POST '))
        ) {
          console.log('Detected comment above me');
          debouncedProvideInlineCompletions(model, position);
          return items;
        } else {
          // console.log('Somewhere else, returning empty array');
          return emptyItems;
        }
      },
      freeInlineCompletions: () => {
        // Doing nothing here right now.
      },
    });
  };
  return handleEditorDidMount;
};

export const provideInlineCompletions = (
  model: monaco.editor.ITextModel,
  position: monaco.Position
) => {
  const currentLine = model.getValueInRange({
    startLineNumber: position.lineNumber,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: 999,
  });

  if (
    currentLine.startsWith('#') ||
    currentLine.startsWith('') ||
    lineStartsWithVerb(currentLine)
  ) {
    console.log('current line is comment or empty line, preparing input');
    // rewind to top of the comment stack.
    let line = currentLine;
    let currentPosition = position.lineNumber - 1;
    console.log('currentPosition', currentPosition);
    line = model.getValueInRange({
      startLineNumber: currentPosition,
      startColumn: 1,
      endLineNumber: currentPosition,
      endColumn: 999,
    });
    while (line.startsWith('#')) {
      currentPosition--;
      line = model.getValueInRange({
        startLineNumber: currentPosition,
        startColumn: 1,
        endLineNumber: currentPosition,
        endColumn: 999,
      });
    }

    // go line by line through the comments
    let body = '';
    currentPosition = currentPosition + 1;
    line = model.getValueInRange({
      startLineNumber: currentPosition,
      startColumn: 1,
      endLineNumber: currentPosition,
      endColumn: 999,
    });
    while (line.startsWith('#')) {
      if (body !== '') {
        body = `${body}\n${line}`;
      } else {
        body = line;
      }
      currentPosition++;
      line = model.getValueInRange({
        startLineNumber: currentPosition,
        startColumn: 1,
        endLineNumber: currentPosition,
        endColumn: 999,
      });
    }
    sendInputToServer(`${body}\n\n`);
  }
};

export const debouncedProvideInlineCompletions = debounce(provideInlineCompletions, 1500, {
  trailing: true,
  maxWait: 5000,
});

export const sendInputToServer = async (input: string) => {
  console.log(`Sending text to server:\n----\n${input}\n----`);

  const result = await fetch('/api/console/openai', {
    method: 'POST',
    body: JSON.stringify({
      input,
    }),
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'kbn-version': '8.2.0',
    },
  });
  const json: APIShape = await result.json();
  console.log(
    'items from server:\n',
    JSON.stringify(json.items, null, 2)
      .replaceAll('\\n', '\n')
      .replaceAll('\\r', '\r')
      .replaceAll('\\"', '"')
  );
  items.items = json.items;
};

export const expandRangeToRequestEdges = async (
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  dispatch: React.Dispatch<Actions>
) => {
  const currentLine = model.getValueInRange({
    startLineNumber: position.lineNumber,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: 999,
  });
  console.log('currentLine is:', currentLine);
  if (lineStartsWithVerb(currentLine)) {
    const [method, url] = parseLineOfVerbAndUrl(currentLine);
    let line = currentLine;
    let currentPosition = position.lineNumber + 1;
    let body = '';
    while (!line.startsWith('}')) {
      line = model.getValueInRange({
        startLineNumber: currentPosition,
        startColumn: 1,
        endLineNumber: currentPosition,
        endColumn: 999,
      });
      body += line;
      console.log('line:', line);
      console.log('body:', body);
      currentPosition++;
    }
    try {
      const parsed = JSON.parse(body);
      console.log('body parsed:', parsed);
      if (method != null && url != null) {
        const results = await sendRequestToES({
          requests: [
            {
              url,
              method,
              data: [body],
            },
          ],
        });
        dispatch({
          type: 'requestSuccess',
          payload: {
            data: results,
          },
        });
      }
    } catch (e) {
      console.log('error is:', e);
      if (e?.response) {
        dispatch({
          type: 'requestFail',
          payload: e,
        });
      } else {
        dispatch({
          type: 'requestFail',
          payload: undefined,
        });
        // notifications.toasts.addError(e, {
        //   title: i18n.translate('console.notification.error.unknownErrorTitle', {
        //     defaultMessage: 'Unknown Request Error',
        //   }),
        // });
      }
    }
  }
};

export const lineStartsWithVerb = (line: string) => {
  return line.startsWith('GET') || line.startsWith('POST');
};

export const parseLineOfVerbAndUrl = (line: string) => {
  const twoLines = line.trim().split(' ');
  return twoLines;
};
