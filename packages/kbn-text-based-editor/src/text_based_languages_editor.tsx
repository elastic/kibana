/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef, memo, useEffect, useState, useCallback } from 'react';
import classNames from 'classnames';
import {
  SQLLang,
  monaco,
  ESQL_LANG_ID,
  ESQL_THEME_ID,
  ESQLLang,
  ESQLCustomAutocompleteCallbacks,
} from '@kbn/monaco';
import type { AggregateQuery } from '@kbn/es-query';
import { getAggregateQueryMode, getLanguageDisplayName } from '@kbn/es-query';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { IndexManagementPluginSetup } from '@kbn/index-management-plugin/public';
import type { SerializedEnrichPolicy } from '@kbn/index-management-plugin/common';
import {
  type LanguageDocumentationSections,
  LanguageDocumentationPopover,
} from '@kbn/language-documentation-popover';
import { useKibana } from '@kbn/kibana-react-plugin/public';
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
  parseWarning,
  getInlineEditorText,
  getDocumentationSections,
  MonacoError,
} from './helpers';
import { EditorFooter } from './editor_footer';
import { ResizableButton } from './resizable_button';
import { fetchFieldsFromESQL } from './fetch_fields_from_esql';

import './overwrite.scss';

export interface TextBasedLanguagesEditorProps {
  query: AggregateQuery;
  onTextLangQueryChange: (query: AggregateQuery) => void;
  onTextLangQuerySubmit: () => void;
  expandCodeEditor: (status: boolean) => void;
  isCodeEditorExpanded: boolean;
  detectTimestamp?: boolean;
  errors?: Error[];
  warning?: string;
  isDisabled?: boolean;
  isDarkMode?: boolean;
  dataTestSubj?: string;
  hideMinimizeButton?: boolean;
  hideRunQueryText?: boolean;
}

interface TextBasedEditorDeps {
  dataViews: DataViewsPublicPluginStart;
  expressions: ExpressionsStart;
  indexManagementApiService?: IndexManagementPluginSetup['apiService'];
}

const MAX_COMPACT_VIEW_LENGTH = 250;
const FONT_WIDTH = 8;
const EDITOR_ONE_LINER_UNUSED_SPACE = 180;
const EDITOR_ONE_LINER_UNUSED_SPACE_WITH_ERRORS = 220;

const KEYCODE_ARROW_UP = 38;
const KEYCODE_ARROW_DOWN = 40;

const languageId = (language: string) => {
  switch (language) {
    case 'esql': {
      return ESQL_LANG_ID;
    }
    case 'sql':
    default: {
      return SQLLang.ID;
    }
  }
};

let clickedOutside = false;
let initialRender = true;
let updateLinesFromModel = false;
let currentCursorContent = '';

export const TextBasedLanguagesEditor = memo(function TextBasedLanguagesEditor({
  query,
  onTextLangQueryChange,
  onTextLangQuerySubmit,
  expandCodeEditor,
  isCodeEditorExpanded,
  detectTimestamp = false,
  errors,
  warning,
  isDisabled,
  isDarkMode,
  hideMinimizeButton,
  hideRunQueryText,
  dataTestSubj,
}: TextBasedLanguagesEditorProps) {
  const { euiTheme } = useEuiTheme();
  const language = getAggregateQueryMode(query);
  const queryString: string = query[language] ?? '';
  const kibana = useKibana<TextBasedEditorDeps>();
  const { dataViews, expressions, indexManagementApiService } = kibana.services;
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
  const [editorWarning, setEditorWarning] = useState<MonacoError[]>([]);

  const [documentationSections, setDocumentationSections] =
    useState<LanguageDocumentationSections>();

  const policiesRef = useRef<SerializedEnrichPolicy[]>([]);
  const styles = textBasedLanguagedEditorStyles(
    euiTheme,
    isCompactFocused,
    editorHeight,
    isCodeEditorExpanded,
    Boolean(errors?.length),
    Boolean(warning),
    isCodeEditorExpandedFocused,
    Boolean(documentationSections)
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
        if (editor1?.current) {
          const currentPosition = editor1.current?.getPosition();
          const content = editorModel.current?.getValueInRange({
            startLineNumber: 0,
            startColumn: 0,
            endLineNumber: currentPosition?.lineNumber ?? 1,
            endColumn: currentPosition?.column ?? 1,
          });
          if (content) {
            currentCursorContent = content || editor1.current?.getValue();
          }
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
      if (warning && (!errors || !errors.length)) {
        const parsedWarning = parseWarning(warning);
        setEditorWarning(parsedWarning);
      } else {
        setEditorWarning([]);
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
    [errors, warning]
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
          (errors && errors.length) || warning
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
    [isCompactFocused, queryString, errors, warning]
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

  const getSourceIdentifiers: ESQLCustomAutocompleteCallbacks['getSourceIdentifiers'] =
    useCallback(async () => {
      const indices = await dataViews.getIndices({
        showAllIndices: false,
        pattern: '*',
        isRollupIndex: () => false,
      });
      return indices.map((i) => i.name);
    }, [dataViews]);

  const getFieldsIdentifiers: ESQLCustomAutocompleteCallbacks['getFieldsIdentifiers'] = useCallback(
    async (ctx) => {
      const pipes = currentCursorContent?.split('|');
      pipes?.pop();
      const validContent = pipes?.join('|');
      if (validContent) {
        // ES|QL with limit 0 returns only the columns and is more performant
        const esqlQuery = {
          esql: `${validContent} | limit 0`,
        };
        try {
          const table = await fetchFieldsFromESQL(esqlQuery, expressions);
          return table?.columns.map((c) => c.name) || [];
        } catch (e) {
          // no action yet
        }
      }
      return [];
    },
    [expressions]
  );

  const getPoliciesIdentifiers: ESQLCustomAutocompleteCallbacks['getPoliciesIdentifiers'] =
    useCallback(
      async (ctx) => {
        const { data: policies, error } =
          (await indexManagementApiService?.getAllEnrichPolicies()) || {};
        policiesRef.current = policies || [];
        if (error || !policies) {
          return [];
        }
        return policies.map(({ name, sourceIndices }) => ({ name, indices: sourceIndices }));
      },
      [indexManagementApiService]
    );

  const getPolicyFieldsIdentifiers: ESQLCustomAutocompleteCallbacks['getPolicyFieldsIdentifiers'] =
    useCallback(
      async (ctx) =>
        policiesRef.current
          .filter(({ name }) => ctx.userDefinedVariables.policyIdentifiers.includes(name))
          .flatMap(({ enrichFields }) => enrichFields),
      []
    );

  const getPolicyMatchingFieldIdentifiers: ESQLCustomAutocompleteCallbacks['getPolicyMatchingFieldIdentifiers'] =
    useCallback(
      async (ctx) => {
        // try to load the list if none is present yet but
        // at least one policy is declared in the userDefinedVariables
        // (this happens if the user pastes an ESQL statement with the policy name in it)
        if (!policiesRef.current.length && ctx.userDefinedVariables.policyIdentifiers.length) {
          await getPoliciesIdentifiers(ctx);
        }
        const matchingField = policiesRef.current.find(({ name }) =>
          ctx.userDefinedVariables.policyIdentifiers.includes(name)
        )?.matchField;
        return matchingField ? [matchingField] : [];
      },
      [getPoliciesIdentifiers]
    );

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
    theme: language === 'esql' ? ESQL_THEME_ID : isDark ? 'vs-dark' : 'vs',
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
    readOnly:
      isDisabled || Boolean(!isCompactFocused && codeOneLiner && codeOneLiner.includes('...')),
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
              {!Boolean(hideMinimizeButton) && (
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
              )}
              <EuiFlexItem grow={false}>
                {documentationSections && (
                  <EuiFlexItem grow={false}>
                    <LanguageDocumentationPopover
                      language={getLanguageDisplayName(String(language)).toUpperCase()}
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
                )}
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
                    {!isCompactFocused && warning && (!errors || errors.length === 0) && (
                      <EuiBadge
                        color={euiTheme.colors.warning}
                        css={styles.errorsBadge}
                        iconType="warning"
                        iconSide="left"
                        data-test-subj="TextBasedLangEditor-inline-warning-badge"
                      >
                        {editorWarning.length}
                      </EuiBadge>
                    )}
                    <CodeEditor
                      languageId={languageId(language)}
                      value={codeOneLiner || code}
                      options={codeEditorOptions}
                      width="100%"
                      suggestionProvider={
                        language === 'esql'
                          ? ESQLLang.getSuggestionProvider?.({
                              getSourceIdentifiers,
                              getFieldsIdentifiers,
                              getPoliciesIdentifiers,
                              getPolicyFieldsIdentifiers,
                              getPolicyMatchingFieldIdentifiers,
                            })
                          : undefined
                      }
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
                        warning={editorWarning}
                        onErrorClick={onErrorClick}
                        refreshErrors={onTextLangQuerySubmit}
                        detectTimestamp={detectTimestamp}
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
                      ...(documentationSections
                        ? {
                            borderRadius: 0,
                          }
                        : {
                            borderTopLeftRadius: 0,
                            borderBottomLeftRadius: 0,
                          }),
                      backgroundColor: isDark ? euiTheme.colors.lightestShade : '#e9edf3',
                      border: '1px solid rgb(17 43 134 / 10%) !important',
                    }}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {documentationSections && (
                  <EuiFlexItem grow={false}>
                    <LanguageDocumentationPopover
                      language={
                        String(language) === 'esql' ? 'ES|QL' : String(language).toUpperCase()
                      }
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
                )}
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
          warning={editorWarning}
          onErrorClick={onErrorClick}
          refreshErrors={onTextLangQuerySubmit}
          detectTimestamp={detectTimestamp}
          hideRunQueryText={hideRunQueryText}
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
