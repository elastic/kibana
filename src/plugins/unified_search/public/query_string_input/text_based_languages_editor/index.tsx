/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef, memo, useEffect, useState, useCallback } from 'react';
import { EsqlLang, monaco } from '@kbn/monaco';

import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  useEuiTheme,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiPopover,
  EuiResizeObserver,
  EuiOutsideClickDetector,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import type { CodeEditorProps } from '@kbn/kibana-react-plugin/public';

import {
  textBasedLanguagedEditorStyles,
  EDITOR_INITIAL_HEIGHT,
  EDITOR_INITIAL_HEIGHT_EXPANDED,
  EDITOR_MAX_HEIGHT,
  EDITOR_MIN_HEIGHT,
} from './text_based_languages_editor.styles';
import { MemoizedDocumentation } from './documentation';
import { useDebounceWithOptions } from './helpers';

interface TextBasedLanguagesEditorProps {
  query: any;
  onTextLangQueryChange: (query: any) => void;
  expandCodeEditor: (status: boolean) => void;
  isCodeEditorExpanded: boolean;
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
let initialRender = true;

export const TextBasedLanguagesEditor = memo(function TextBasedLanguagesEditor({
  query,
  onTextLangQueryChange,
  expandCodeEditor,
  isCodeEditorExpanded,
}: TextBasedLanguagesEditorProps) {
  const { euiTheme } = useEuiTheme();
  const language = getTextBasedLanguage(query);
  const editorModel = useRef<monaco.editor.ITextModel>();
  const editor1 = useRef<monaco.editor.IStandaloneCodeEditor>();
  const [lines, setLines] = useState(1);
  const [code, setCode] = useState(query.sql);
  const [editorHeight, setEditorHeight] = useState(
    isCodeEditorExpanded ? EDITOR_INITIAL_HEIGHT_EXPANDED : EDITOR_INITIAL_HEIGHT
  );
  const [showLineNumbers, setShowLineNumbers] = useState(isCodeEditorExpanded);
  const [isCompactFocused, setIsCompactFocused] = useState(isCodeEditorExpanded);
  const [isWordWrapped, setIsWordWrapped] = useState(false);
  const [userDrags, setUserDrags] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  const styles = textBasedLanguagedEditorStyles(
    euiTheme,
    isCompactFocused,
    editorHeight,
    isCodeEditorExpanded
  );

  const ref = useRef(null);

  const onMouseDownResizeHandler = useCallback(
    (mouseDownEvent: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      const startSize = editorHeight;
      const startPosition = mouseDownEvent.pageY;

      function onMouseMove(mouseMoveEvent: MouseEvent) {
        const height = startSize - startPosition + mouseMoveEvent.pageY;
        const validatedHeight = Math.min(Math.max(height, EDITOR_MIN_HEIGHT), EDITOR_MAX_HEIGHT);
        setEditorHeight(validatedHeight);
        setUserDrags(true);
      }
      function onMouseUp() {
        document.body.removeEventListener('mousemove', onMouseMove);
        setUserDrags(false);
      }

      document.body.addEventListener('mousemove', onMouseMove);
      document.body.addEventListener('mouseup', onMouseUp, { once: true });
    },
    [editorHeight]
  );

  const updateHeight = () => {
    if (editor1.current) {
      const linesCount = editorModel.current?.getLineCount() || 1;
      if (linesCount === 1 || clickedOutside || initialRender) return;
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
    if (isCodeEditorExpanded) return;
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
        initialRender = false;
        setShowLineNumbers(true);
      });
      if (!isCodeEditorExpanded) {
        editor1.current?.onDidContentSizeChange(updateHeight);
      }
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

  const onQueryUpdate = useCallback(
    (value: string) => {
      setCode(value);
      onTextLangQueryChange({ sql: value });
    },
    [onTextLangQueryChange]
  );

  const codeEditorOptions: CodeEditorProps['options'] = {
    automaticLayout: false,
    folding: false,
    fontSize: 14,
    scrollBeyondLastLine: false,
    quickSuggestions: true,
    minimap: { enabled: false },
    wordWrap: isWordWrapped ? 'on' : 'off',
    lineNumbers: showLineNumbers ? 'on' : 'off',
    lineDecorationsWidth: 16,
    autoIndent: 'brackets',
    wrappingIndent: 'none',
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    scrollbar: {
      vertical: 'auto',
      horizontal: 'hidden',
    },
    overviewRulerBorder: false,
  };

  if (isCompactFocused) {
    codeEditorOptions.overviewRulerLanes = 4;
    codeEditorOptions.hideCursorInOverviewRuler = false;
    codeEditorOptions.overviewRulerBorder = true;
  }

  const editorPanel = (
    <>
      {isCodeEditorExpanded && (
        <EuiFlexGroup
          gutterSize="s"
          justifyContent="spaceBetween"
          css={styles.topContainer}
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType={isWordWrapped ? 'wordWrap' : 'wordWrapDisabled'}
              display={!isWordWrapped ? 'fill' : undefined}
              color="text"
              aria-label={
                isWordWrapped
                  ? i18n.translate(
                      'unifiedSearch.query.textBasedLanguagesEditor.disableWordWrapLabel',
                      {
                        defaultMessage: 'Disable word wrap',
                      }
                    )
                  : i18n.translate(
                      'unifiedSearch.query.textBasedLanguagesEditor.EnableWordWrapLabel',
                      {
                        defaultMessage: 'Enable word wrap',
                      }
                    )
              }
              isSelected={!isWordWrapped}
              onClick={() => {
                editor1.current?.updateOptions({
                  wordWrap: isWordWrapped ? 'off' : 'on',
                });
                setIsWordWrapped(!isWordWrapped);
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false} gutterSize="none" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="minimize"
                  color="text"
                  aria-label={i18n.translate(
                    'unifiedSearch.query.textBasedLanguagesEditor.MinimizeEditor',
                    {
                      defaultMessage: 'Minimize editor',
                    }
                  )}
                  onClick={() => {
                    expandCodeEditor(false);
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiPopover
                  panelClassName="documentation__docs--overlay"
                  panelPaddingSize="none"
                  isOpen={isHelpOpen}
                  closePopover={() => setIsHelpOpen(false)}
                  ownFocus={false}
                  button={
                    <EuiButtonIcon
                      iconType="documentation"
                      color="text"
                      aria-label="Documentation"
                      onClick={() => setIsHelpOpen(true)}
                    />
                  }
                >
                  <MemoizedDocumentation />
                </EuiPopover>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiFlexGroup gutterSize="none" responsive={false} css={{ margin: 0 }}>
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
                      options={codeEditorOptions}
                      width="100%"
                      onChange={onQueryUpdate}
                      editorDidMount={(editor) => {
                        editor1.current = editor;
                        const model = editor.getModel();
                        if (model) {
                          editorModel.current = model;
                        }
                        setLines(model?.getLineCount() || 1);
                      }}
                    />
                    {isCompactFocused && !isCodeEditorExpanded && (
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
        {!isCodeEditorExpanded && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false} gutterSize="none" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  display="base"
                  iconType="expand"
                  size="m"
                  aria-label="Expand"
                  onClick={() => expandCodeEditor(true)}
                  css={{ borderRadius: 0 }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiPopover
                  panelClassName="documentation__docs--overlay"
                  panelPaddingSize="none"
                  isOpen={isHelpOpen}
                  closePopover={() => setIsHelpOpen(false)}
                  ownFocus={false}
                  button={
                    <EuiButtonIcon
                      display="base"
                      iconType="documentation"
                      size="m"
                      aria-label="Documentation"
                      onClick={() => setIsHelpOpen(true)}
                      css={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                    />
                  }
                >
                  <MemoizedDocumentation />
                </EuiPopover>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {isCodeEditorExpanded && (
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
                    {i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.runQuery', {
                      defaultMessage: 'Run query',
                    })}
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
      {isCodeEditorExpanded && (
        <div ref={ref} css={styles.dragResizeContainer} onMouseDown={onMouseDownResizeHandler}>
          {!userDrags && (
            <EuiButtonIcon
              color="primary"
              iconType="grab"
              aria-label="Resize editor"
              css={styles.dragResizeButton}
            />
          )}
          {userDrags && <div css={{ height: '5px', backgroundColor: euiTheme.colors.primary }} />}
        </div>
      )}
    </>
  );

  return editorPanel;
});
