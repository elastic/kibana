/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import classNames from 'classnames';
import { SQLLang, monaco } from '@kbn/monaco';
import type { AggregateQuery } from '@kbn/es-query';
import { getAggregateQueryMode } from '@kbn/es-query';
import {
  type LanguageDocumentationSections,
  LanguageDocumentationPopover,
} from '@kbn/language-documentation-popover';

import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiResizeObserver,
  EuiOutsideClickDetector,
  EuiToolTip,
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
import {
  useDebounceWithOptions,
  parseErrors,
  getInlineEditorText,
  getDocumentationSections,
  MonacoError,
} from './helpers';
import { EditorFooter } from './editor_footer';
import { ResizableButton } from './resizable_button';

import './overwrite.scss';

export interface TextBasedLanguagesEditorProps {
  query: AggregateQuery;
  onTextLangQueryChange: (query: AggregateQuery) => void;
  onTextLangQuerySubmit: () => void;
  expandCodeEditor: (status: boolean) => void;
  isCodeEditorExpanded: boolean;
  errors?: Error[];
  isDisabled?: boolean;
  isDarkMode?: boolean;
  dataTestSubj?: string;
}

const MAX_COMPACT_VIEW_LENGTH = 250;
const FONT_WIDTH = 8;
const EDITOR_ONE_LINER_UNUSED_SPACE = 180;
const EDITOR_ONE_LINER_UNUSED_SPACE_WITH_ERRORS = 220;

const KEYCODE_ARROW_UP = 38;
const KEYCODE_ARROW_DOWN = 40;

const languageId = (language: string) => {
  switch (language) {
    case 'sql':
    default: {
      return SQLLang.ID;
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
  isDisabled,
  isDarkMode,
  dataTestSubj,
}: TextBasedLanguagesEditorProps) {
  const { euiTheme } = useEuiTheme();
  const language = getAggregateQueryMode(query);
  const queryString: string = query[language] ?? '';
  const [lines, setLines] = useState(1);
  const [code, setCode] = useState(queryString ?? '');
  const [codeOneLiner, setCodeOneLiner] = useState('');
  const [editorHeight, setEditorHeight] = useState(
    isCodeEditorExpanded ? EDITOR_INITIAL_HEIGHT_EXPANDED : EDITOR_INITIAL_HEIGHT
  );
  const [showLineNumbers, setShowLineNumbers] = useState(isCodeEditorExpanded);
  const [isCompactFocused, setIsCompactFocused] = useState(isCodeEditorExpanded);
  const [isCodeEditorExpandedFocused, setIsCodeEditorExpandedFocused] = useState(false);
  const [isWordWrapped, setIsWordWrapped] = useState(true);
  const [editorErrors, setEditorErrors] = useState<MonacoError[]>([]);
  const [documentationSections, setDocumentationSections] =
    useState<LanguageDocumentationSections>();

  const styles = textBasedLanguagedEditorStyles(
    euiTheme,
    isCompactFocused,
    editorHeight,
    isCodeEditorExpanded,
    Boolean(errors?.length),
    isCodeEditorExpandedFocused
  );
  const isDark = isDarkMode;
  const editorModel = useRef<monaco.editor.ITextModel>();
  const editor1 = useRef<monaco.editor.IStandaloneCodeEditor>();
  const containerRef = useRef<HTMLElement>(null);

  const editorClassName = classNames('TextBasedLangEditor', {
    'TextBasedLangEditor--expanded': isCodeEditorExpanded,
    'TextBasedLangEditor--compact': isCompactFocused,
    'TextBasedLangEditor--initial': !isCompactFocused,
  });

  // When the editor is on full size mode, the user can resize the height of the editor.
  const onMouseDownResizeHandler = useCallback(
    (mouseDownEvent) => {
      const startSize = editorHeight;
      const startPosition = mouseDownEvent.pageY;

      function onMouseMove(mouseMoveEvent: MouseEvent) {
        const height = startSize - startPosition + mouseMoveEvent.pageY;
        const validatedHeight = Math.min(Math.max(height, EDITOR_MIN_HEIGHT), EDITOR_MAX_HEIGHT);
        setEditorHeight(validatedHeight);
      }
      function onMouseUp() {
        document.body.removeEventListener('mousemove', onMouseMove);
      }

      document.body.addEventListener('mousemove', onMouseMove);
      document.body.addEventListener('mouseup', onMouseUp, { once: true });
    },
    [editorHeight]
  );

  const onKeyDownResizeHandler = useCallback(
    (keyDownEvent) => {
      let height = editorHeight;
      if (
        keyDownEvent.keyCode === KEYCODE_ARROW_UP ||
        keyDownEvent.keyCode === KEYCODE_ARROW_DOWN
      ) {
        const step = keyDownEvent.keyCode === KEYCODE_ARROW_UP ? -10 : 10;
        height = height + step;
        const validatedHeight = Math.min(Math.max(height, EDITOR_MIN_HEIGHT), EDITOR_MAX_HEIGHT);
        setEditorHeight(validatedHeight);
      }
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
    setIsCodeEditorExpandedFocused(false);
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
        setIsCodeEditorExpandedFocused(true);
        setShowLineNumbers(true);
        setCodeOneLiner('');
        clickedOutside = false;
        initialRender = false;
        updateLinesFromModel = true;
      });
      // on CMD/CTRL + Enter submit the query
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

  const onErrorClick = useCallback(({ startLineNumber, startColumn }: MonacoError) => {
    if (!editor1.current) {
      return;
    }

    editor1.current.focus();
    editor1.current.setPosition({
      lineNumber: startLineNumber,
      column: startColumn,
    });
    editor1.current.revealLine(startLineNumber);
  }, []);

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
        const hasLines = /\r|\n/.exec(queryString);
        if (hasLines && !updateLinesFromModel) {
          setLines(queryString.split(/\r|\n/).length);
        }
        const text = getInlineEditorText(queryString, Boolean(hasLines));
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
          const shortedCode = text;
          setCodeOneLiner(shortedCode);
        }
      }
    },
    [queryString, errors, isCompactFocused]
  );

  useEffect(() => {
    if (editor1.current && !isCompactFocused) {
      const editorElement = editor1.current.getDomNode();
      if (editorElement) {
        const contentWidth = Number(editorElement?.style.width.replace('px', ''));
        if (code !== queryString) {
          setCode(queryString);
          calculateVisibleCode(contentWidth);
        }
      }
    }
  }, [calculateVisibleCode, code, isCompactFocused, queryString]);

  const onResize = ({ width }: { width: number }) => {
    calculateVisibleCode(width);
    if (editor1.current) {
      editor1.current.layout({ width, height: editorHeight });
    }
  };

  const onQueryUpdate = useCallback(
    (value: string) => {
      setCode(value);
      onTextLangQueryChange({ [language]: value } as AggregateQuery);
    },
    [language, onTextLangQueryChange]
  );

  useEffect(() => {
    async function getDocumentation() {
      const sections = await getDocumentationSections(language);
      setDocumentationSections(sections);
    }
    if (!documentationSections) {
      getDocumentation();
    }
  }, [language, documentationSections]);

  const codeEditorOptions: CodeEditorProps['options'] = {
    automaticLayout: false,
    accessibilitySupport: 'off',
    folding: false,
    fontSize: 14,
    padding: {
      top: 8,
      bottom: 8,
    },
    scrollBeyondLastLine: false,
    quickSuggestions: true,
    minimap: { enabled: false },
    wordWrap: isWordWrapped ? 'on' : 'off',
    lineNumbers: showLineNumbers ? 'on' : 'off',
    theme: isDark ? 'vs-dark' : 'vs',
    lineDecorationsWidth: 12,
    autoIndent: 'none',
    wrappingIndent: 'none',
    lineNumbersMinChars: 3,
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    scrollbar: {
      horizontal: 'hidden',
      vertical: 'auto',
    },
    overviewRulerBorder: false,
    readOnly: isDisabled,
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
            <EuiToolTip
              position="top"
              content={
                isWordWrapped
                  ? i18n.translate(
                      'textBasedEditor.query.textBasedLanguagesEditor.disableWordWrapLabel',
                      {
                        defaultMessage: 'Disable word wrap',
                      }
                    )
                  : i18n.translate(
                      'textBasedEditor.query.textBasedLanguagesEditor.EnableWordWrapLabel',
                      {
                        defaultMessage: 'Enable word wrap',
                      }
                    )
              }
            >
              <EuiButtonIcon
                iconType={isWordWrapped ? 'wordWrap' : 'wordWrapDisabled'}
                color="text"
                data-test-subj="TextBasedLangEditor-toggleWordWrap"
                aria-label={
                  isWordWrapped
                    ? i18n.translate(
                        'textBasedEditor.query.textBasedLanguagesEditor.disableWordWrapLabel',
                        {
                          defaultMessage: 'Disable word wrap',
                        }
                      )
                    : i18n.translate(
                        'textBasedEditor.query.textBasedLanguagesEditor.EnableWordWrapLabel',
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
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false} gutterSize="none" alignItems="center">
              <EuiFlexItem grow={false} style={{ marginRight: '8px' }}>
                <EuiToolTip
                  position="top"
                  content={i18n.translate(
                    'textBasedEditor.query.textBasedLanguagesEditor.minimizeTooltip',
                    {
                      defaultMessage: 'Compact query editor',
                    }
                  )}
                >
                  <EuiButtonIcon
                    iconType="minimize"
                    color="text"
                    aria-label={i18n.translate(
                      'textBasedEditor.query.textBasedLanguagesEditor.MinimizeEditor',
                      {
                        defaultMessage: 'Minimize editor',
                      }
                    )}
                    data-test-subj="TextBasedLangEditor-minimize"
                    onClick={() => {
                      expandCodeEditor(false);
                      updateLinesFromModel = false;
                    }}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <LanguageDocumentationPopover
                  language={String(language).toUpperCase()}
                  sections={documentationSections}
                  buttonProps={{
                    color: 'text',
                    'data-test-subj': 'TextBasedLangEditor-documentation',
                    'aria-label': i18n.translate(
                      'textBasedEditor.query.textBasedLanguagesEditor.documentationLabel',
                      {
                        defaultMessage: 'Documentation',
                      }
                    ),
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiFlexGroup
        gutterSize="none"
        responsive={false}
        css={{ margin: '0 0 1px 0' }}
        ref={containerRef}
      >
        <EuiResizeObserver onResize={onResize}>
          {(resizeRef) => (
            <EuiOutsideClickDetector
              onOutsideClick={() => {
                restoreInitialMode();
              }}
            >
              <div ref={resizeRef} css={styles.resizableContainer}>
                <EuiFlexItem
                  data-test-subj={dataTestSubj ?? 'TextBasedLangEditor'}
                  className={editorClassName}
                >
                  <div css={styles.editorContainer}>
                    {!isCompactFocused && (
                      <EuiBadge
                        color={euiTheme.colors.lightShade}
                        css={styles.linesBadge}
                        data-test-subj="TextBasedLangEditor-inline-lines-badge"
                      >
                        {i18n.translate(
                          'textBasedEditor.query.textBasedLanguagesEditor.lineCount',
                          {
                            defaultMessage: '{count} {count, plural, one {line} other {lines}}',
                            values: { count: lines },
                          }
                        )}
                      </EuiBadge>
                    )}
                    {!isCompactFocused && errors && errors.length > 0 && (
                      <EuiBadge
                        color={euiTheme.colors.danger}
                        css={styles.errorsBadge}
                        iconType="error"
                        iconSide="left"
                        data-test-subj="TextBasedLangEditor-inline-errors-badge"
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
                        onErrorClick={onErrorClick}
                        refreshErrors={onTextLangQuerySubmit}
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
                <EuiToolTip
                  position="top"
                  content={i18n.translate(
                    'textBasedEditor.query.textBasedLanguagesEditor.expandTooltip',
                    {
                      defaultMessage: 'Expand query editor',
                    }
                  )}
                >
                  <EuiButtonIcon
                    display="empty"
                    iconType="expand"
                    size="m"
                    aria-label="Expand"
                    onClick={() => expandCodeEditor(true)}
                    data-test-subj="TextBasedLangEditor-expand"
                    css={{
                      borderRadius: 0,
                      backgroundColor: isDark ? euiTheme.colors.lightestShade : '#e9edf3',
                      border: '1px solid rgb(17 43 134 / 10%) !important',
                    }}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <LanguageDocumentationPopover
                  language={String(language).toUpperCase()}
                  sections={documentationSections}
                  buttonProps={{
                    display: 'empty',
                    'data-test-subj': 'TextBasedLangEditor-inline-documentation',
                    'aria-label': i18n.translate(
                      'textBasedEditor.query.textBasedLanguagesEditor.documentationLabel',
                      {
                        defaultMessage: 'Documentation',
                      }
                    ),
                    size: 'm',
                    css: {
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                      backgroundColor: isDark ? euiTheme.colors.lightestShade : '#e9edf3',
                      border: '1px solid rgb(17 43 134 / 10%) !important',
                      borderLeft: 'transparent !important',
                    },
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {isCodeEditorExpanded && (
        <EditorFooter
          lines={lines}
          containerCSS={styles.bottomContainer}
          errors={editorErrors}
          onErrorClick={onErrorClick}
          refreshErrors={onTextLangQuerySubmit}
        />
      )}
      {isCodeEditorExpanded && (
        <ResizableButton
          onMouseDownResizeHandler={onMouseDownResizeHandler}
          onKeyDownResizeHandler={onKeyDownResizeHandler}
        />
      )}
    </>
  );

  return editorPanel;
});
