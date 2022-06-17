/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef, memo, useEffect, useState } from 'react';
import { EsqlLang, monaco } from '@kbn/monaco';

import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  useEuiTheme,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiResizeObserver,
  EuiOutsideClickDetector,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import {
  textBasedLanguagedEditorStyles,
  EDITOR_INITIAL_HEIGHT,
} from './text_based_languages_editor.styles';
import { useDebounceWithOptions } from './helpers';

interface TextBasedLanguagesEditorProps {
  query: any;
}

const MAX_COMPACT_VIEW_LENGTH = 250;
const OS_COMMAND_KEY = '⌘';

const getTextBasedLanguage = (query: any) => {
  return Object.keys(query)[0];
};

const languageId = (language: string) => {
  switch (language) {
    case 'sql':
    default: {
      return EsqlLang.ID;
    }
  }
};
let clickedOutside = false;

export const TextBasedLanguagesEditor = memo(function TextBasedLanguagesEditor({
  query,
}: TextBasedLanguagesEditorProps) {
  const { euiTheme } = useEuiTheme();
  const language = getTextBasedLanguage(query);
  const editorModel = useRef<monaco.editor.ITextModel>();
  const editor1 = useRef<monaco.editor.IStandaloneCodeEditor>();
  const [lines, setLines] = useState(1);
  const [code, setCode] = useState(query.sql);
  const [editorHeight, setEditorHeight] = useState(EDITOR_INITIAL_HEIGHT);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [isCompactFocused, setIsCompactFocused] = useState(false);
  const styles = textBasedLanguagedEditorStyles(euiTheme, isCompactFocused, editorHeight);

  const updateHeight = () => {
    if (editor1.current) {
      const linesCount = editorModel.current?.getLineCount() || 1;
      if (linesCount === 1 || clickedOutside) return;
      const editorElement = editor1.current.getDomNode();
      const contentHeight = Math.min(MAX_COMPACT_VIEW_LENGTH, editor1.current.getContentHeight());

      if (editorElement) {
        editorElement.style.height = `${contentHeight}px`;
      }
      const contentWidth = Number(editorElement?.style.width.replace('px', ''));
      editor1.current.layout({ width: contentWidth, height: contentHeight });
      setEditorHeight(contentHeight);
    }
  };

  const restoreInitialMode = () => {
    setEditorHeight(EDITOR_INITIAL_HEIGHT);
    setIsCompactFocused(false);
    setShowLineNumbers(false);
    clickedOutside = true;
    if (editor1.current) {
      const editorElement = editor1.current.getDomNode();
      if (editorElement) {
        editorElement.style.height = `${EDITOR_INITIAL_HEIGHT}px`;
        const contentWidth = Number(editorElement?.style.width.replace('px', ''));
        editor1.current.layout({ width: contentWidth, height: EDITOR_INITIAL_HEIGHT });
      }
    }
  };

  useDebounceWithOptions(
    () => {
      if (!editorModel.current) return;
      editor1.current?.onDidChangeModelContent((e) => {
        setLines(editorModel.current?.getLineCount() || 1);
      });
      editor1.current?.onDidFocusEditorText(() => {
        setIsCompactFocused(true);
        clickedOutside = false;
        setShowLineNumbers(true);
      });
      editor1.current?.onDidContentSizeChange(updateHeight);
    },
    { skipFirstRender: false },
    256,
    []
  );

  // Clean up the monaco editor and DOM on unmount
  useEffect(() => {
    const model = editorModel;
    const editor1ref = editor1;
    return () => {
      model.current?.dispose();
      editor1ref.current?.dispose();
    };
  }, []);

  const onResize = ({ width }: { width: number }) => {
    if (editor1.current) {
      editor1.current.layout({ width, height: editorHeight });
    }
  };

  return (
    <EuiResizeObserver onResize={onResize}>
      {(resizeRef) => (
        <EuiOutsideClickDetector
          onOutsideClick={() => {
            restoreInitialMode();
          }}
        >
          <div ref={resizeRef} css={styles.resizableContainer}>
            <EuiFlexItem data-test-subj="unifiedTextLandEditor">
              <div css={styles.editorContainer}>
                {!isCompactFocused && (
                  <EuiBadge color="default" css={styles.linesBadge}>
                    {`${lines} lines`}
                  </EuiBadge>
                )}
                <CodeEditor
                  languageId={languageId(language)}
                  value={code}
                  options={{
                    automaticLayout: false,
                    folding: false,
                    fontSize: 14,
                    scrollBeyondLastLine: false,
                    quickSuggestions: true,
                    minimap: { enabled: false },
                    wordWrap: 'on',
                    lineNumbers: showLineNumbers ? 'on' : 'off',
                    lineDecorationsWidth: 16,
                    autoIndent: 'brackets',
                    wrappingIndent: 'none',
                  }}
                  width="100%"
                  onChange={setCode}
                  editorDidMount={(editor) => {
                    editor1.current = editor;
                    const model = editor.getModel();
                    if (model) {
                      editorModel.current = model;
                    }
                    setLines(model?.getLineCount() || 1);
                  }}
                />
                {isCompactFocused && (
                  <EuiFlexGroup
                    gutterSize="s"
                    justifyContent="spaceBetween"
                    css={styles.bottomContainer}
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiText size="s" color="subdued">
                        <p>{`${lines} lines`}</p>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup gutterSize="xs" responsive={false}>
                        <EuiFlexItem grow={false}>
                          <EuiText size="s" color="subdued">
                            <p>
                              {i18n.translate(
                                'unifiedSearch.query.textBasedLanguagesEditor.runQuery',
                                {
                                  defaultMessage: 'Run query',
                                }
                              )}
                            </p>
                          </EuiText>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiBadge color="default">{`${OS_COMMAND_KEY} + Enter`} </EuiBadge>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                )}
              </div>
            </EuiFlexItem>
          </div>
        </EuiOutsideClickDetector>
      )}
    </EuiResizeObserver>
  );
});
