/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef, memo, useEffect, useState, useCallback } from 'react';
import { EsqlLang, monaco } from '@kbn/monaco';
import type { AggregateQuery } from '@kbn/es-query';
import { getAggregateQueryMode } from '@kbn/es-query';

import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  useEuiTheme,
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
import { MemoizedDocumentation, DocumentationSections } from './documentation';
import { useDebounceWithOptions, parseErrors, getDocumentationSections } from './helpers';
import { EditorFooter } from './editor_footer';

interface TextBasedLanguagesEditorProps {
  query: any;
  onTextLangQueryChange: (query: AggregateQuery) => void;
  onTextLangQuerySubmit: () => void;
  expandCodeEditor: (status: boolean) => void;
  isCodeEditorExpanded: boolean;
  errors?: Error[];
}

const MAX_COMPACT_VIEW_LENGTH = 250;
const FONT_WIDTH = 8;
const EDITOR_ONE_LINER_UNUSED_SPACE = 180;
const EDITOR_ONE_LINER_UNUSED_SPACE_WITH_ERRORS = 220;

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
let updateLinesFromModel = false;

export const TextBasedLanguagesEditor = memo(function TextBasedLanguagesEditor({
  query,
  onTextLangQueryChange,
  onTextLangQuerySubmit,
  expandCodeEditor,
  isCodeEditorExpanded,
  errors,
}: TextBasedLanguagesEditorProps) {
  const { euiTheme } = useEuiTheme();
  const language = getAggregateQueryMode(query);
  const editorModel = useRef<monaco.editor.ITextModel>();
  const editor1 = useRef<monaco.editor.IStandaloneCodeEditor>();
  const [lines, setLines] = useState(1);
  const [code, setCode] = useState(query.sql);
  const [codeOneLiner, setCodeOneLiner] = useState('');
  const [editorHeight, setEditorHeight] = useState(
    isCodeEditorExpanded ? EDITOR_INITIAL_HEIGHT_EXPANDED : EDITOR_INITIAL_HEIGHT
  );
  const [showLineNumbers, setShowLineNumbers] = useState(isCodeEditorExpanded);
  const [isCompactFocused, setIsCompactFocused] = useState(isCodeEditorExpanded);
  const [isWordWrapped, setIsWordWrapped] = useState(true);
  const [userDrags, setUserDrags] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [editorErrors, setEditorErrors] = useState<
    Array<{ startLineNumber: number; message: string }>
  >([]);
  const [documentationSections, setDocumentationSections] = useState<DocumentationSections>();

  const styles = textBasedLanguagedEditorStyles(
    euiTheme,
    isCompactFocused,
    editorHeight,
    isCodeEditorExpanded,
    Boolean(errors?.length)
  );

  const containerRef = useRef<HTMLElement>(null);

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
    updateLinesFromModel = false;
    clickedOutside = true;
    if (editor1.current) {
      const editorElement = editor1.current.getDomNode();
      if (editorElement) {
        editorElement.style.height = `${EDITOR_INITIAL_HEIGHT}px`;
        const contentWidth = Number(editorElement?.style.width.replace('px', ''));
        calculateVisibleCode(contentWidth, true);
        editor1.current.layout({ width: contentWidth, height: EDITOR_INITIAL_HEIGHT });
      }
    }
  };

  useDebounceWithOptions(
    () => {
      if (!editorModel.current) return;
      editor1.current?.onDidChangeModelContent((e) => {
        if (updateLinesFromModel) {
          setLines(editorModel.current?.getLineCount() || 1);
        }
      });
      editor1.current?.onDidFocusEditorText(() => {
        setIsCompactFocused(true);
        setShowLineNumbers(true);
        setCodeOneLiner('');
        clickedOutside = false;
        initialRender = false;
        updateLinesFromModel = true;
      });
      // eslint-disable-next-line no-bitwise
      editor1.current?.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, function () {
        onTextLangQuerySubmit();
      });
      if (!isCodeEditorExpanded) {
        editor1.current?.onDidContentSizeChange(updateHeight);
      }
      if (errors && errors.length) {
        const parsedErrors = parseErrors(errors, code);
        setEditorErrors(parsedErrors);
        monaco.editor.setModelMarkers(editorModel.current, 'Unified search', parsedErrors);
      } else {
        monaco.editor.setModelMarkers(editorModel.current, 'Unified search', []);
        setEditorErrors([]);
      }
    },
    { skipFirstRender: false },
    256,
    [errors]
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

  const calculateVisibleCode = useCallback(
    (width: number, force?: boolean) => {
      const containerWidth = containerRef.current?.offsetWidth;
      if (containerWidth && (!isCompactFocused || force)) {
        const hasLines = /\r|\n/.exec(query.sql);
        if (hasLines && !updateLinesFromModel) {
          setLines(query.sql.split(/\r|\n/).length);
        }
        const text = hasLines ? query.sql.split(/\r|\n/)[0] : query.sql;
        const queryLength = text.length;
        const unusedSpace =
          errors && errors.length
            ? EDITOR_ONE_LINER_UNUSED_SPACE_WITH_ERRORS
            : EDITOR_ONE_LINER_UNUSED_SPACE;
        const charactersAlowed = Math.floor((width - unusedSpace) / FONT_WIDTH);
        if (queryLength > charactersAlowed) {
          const shortedCode = text.substring(0, charactersAlowed) + '...';
          setCodeOneLiner(shortedCode);
        } else {
          const shortedCode = hasLines ? `${text}...` : text;
          setCodeOneLiner(shortedCode);
        }
      }
    },
    [query.sql, errors, isCompactFocused]
  );

  useEffect(() => {
    if (editor1.current) {
      const editorElement = editor1.current.getDomNode();
      if (editorElement) {
        const contentWidth = Number(editorElement?.style.width.replace('px', ''));
        if (code !== query.sql) {
          setCode(query.sql);
          calculateVisibleCode(contentWidth);
        }
      }
    }
  }, [calculateVisibleCode, code, query.sql]);

  const onResize = ({ width }: { width: number }) => {
    calculateVisibleCode(width);
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

  useEffect(() => {
    async function getDocumentation() {
      const sections = await getDocumentationSections(language);
      setDocumentationSections(sections);
    }

    getDocumentation();
  }, [language]);

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
    accessibilitySupport: 'off',
    autoIndent: 'none',
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
                    updateLinesFromModel = false;
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
                  <MemoizedDocumentation language={language} sections={documentationSections} />
                </EuiPopover>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiFlexGroup gutterSize="none" responsive={false} css={{ margin: 0 }} ref={containerRef}>
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
                        {i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.lineCount', {
                          defaultMessage: '{count} {count, plural, one {line} other {lines}}',
                          values: { count: lines },
                        })}
                      </EuiBadge>
                    )}
                    {!isCompactFocused && errors && errors.length > 0 && (
                      <EuiBadge
                        color={euiTheme.colors.danger}
                        css={styles.errorsBadge}
                        iconType="crossInACircleFilled"
                        iconSide="left"
                      >
                        {errors.length}
                      </EuiBadge>
                    )}
                    <CodeEditor
                      languageId={languageId(language)}
                      value={codeOneLiner || code}
                      options={codeEditorOptions}
                      width="100%"
                      onChange={onQueryUpdate}
                      editorDidMount={(editor) => {
                        editor1.current = editor;
                        const model = editor.getModel();
                        if (model) {
                          editorModel.current = model;
                        }
                        if (isCodeEditorExpanded) {
                          setLines(model?.getLineCount() || 1);
                        }
                      }}
                    />
                    {isCompactFocused && !isCodeEditorExpanded && (
                      <EditorFooter
                        lines={lines}
                        containerCSS={styles.bottomContainer}
                        errors={editorErrors}
                      />
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
                  <MemoizedDocumentation language={language} sections={documentationSections} />
                </EuiPopover>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {isCodeEditorExpanded && (
        <EditorFooter lines={lines} containerCSS={styles.bottomContainer} errors={editorErrors} />
      )}
      {isCodeEditorExpanded && (
        <div css={styles.dragResizeContainer} onMouseDown={onMouseDownResizeHandler}>
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
