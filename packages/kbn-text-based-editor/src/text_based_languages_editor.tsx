/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef, memo, useEffect, useState, useCallback, useMemo } from 'react';
import classNames from 'classnames';
import memoize from 'lodash/memoize';
import {
  SQLLang,
  monaco,
  ESQL_LANG_ID,
  ESQL_THEME_ID,
  ESQLLang,
  type ESQLCallbacks,
} from '@kbn/monaco';
import type { AggregateQuery } from '@kbn/es-query';
import { getAggregateQueryMode, getLanguageDisplayName } from '@kbn/es-query';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { IndexManagementPluginSetup } from '@kbn/index-management';
import { TooltipWrapper } from '@kbn/visualization-utils';
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
import { CodeEditor, CodeEditorProps } from '@kbn/code-editor';

import {
  textBasedLanguagedEditorStyles,
  EDITOR_INITIAL_HEIGHT,
  EDITOR_INITIAL_HEIGHT_EXPANDED,
  EDITOR_MAX_HEIGHT,
  EDITOR_MIN_HEIGHT,
} from './text_based_languages_editor.styles';
import {
  useDebounceWithOptions,
  parseWarning,
  getInlineEditorText,
  getDocumentationSections,
  type MonacoMessage,
  getWrappedInPipesCode,
  parseErrors,
  getIndicesList,
  getRemoteIndicesList,
  clearCacheWhenOld,
} from './helpers';
import { EditorFooter } from './editor_footer';
import { ResizableButton } from './resizable_button';
import { fetchFieldsFromESQL } from './fetch_fields_from_esql';
import { ErrorsWarningsCompactViewPopover } from './errors_warnings_popover';
import { addQueriesToCache, updateCachedQueries } from './history_local_storage';

import './overwrite.scss';

export interface TextBasedLanguagesEditorProps {
  /** The aggregate type query */
  query: AggregateQuery;
  /** Callback running everytime the query changes */
  onTextLangQueryChange: (query: AggregateQuery) => void;
  /** Callback running when the user submits the query */
  onTextLangQuerySubmit: (
    query?: AggregateQuery,
    abortController?: AbortController
  ) => Promise<void>;
  /** Can be used to expand/minimize the editor */
  expandCodeEditor: (status: boolean) => void;
  /** If it is true, the editor initializes with height EDITOR_INITIAL_HEIGHT_EXPANDED */
  isCodeEditorExpanded: boolean;
  /** If it is true, the editor displays the message @timestamp found
   * The text based queries are relying on adhoc dataviews which
   * can have an @timestamp timefield or nothing
   */
  detectTimestamp?: boolean;
  /** Array of errors */
  errors?: Error[];
  /** Warning string as it comes from ES */
  warning?: string;
  /** Disables the editor and displays loading icon in run button
   * It is also used for hiding the history component if it is not defined
   */
  isLoading?: boolean;
  /** Disables the editor */
  isDisabled?: boolean;
  /** Indicator if the editor is on dark mode */
  isDarkMode?: boolean;
  dataTestSubj?: string;
  /** If true it hides the minimize button and the user can't return to the minimized version
   * Useful when the application doesn't want to give this capability
   */
  hideMinimizeButton?: boolean;
  /** Hide the Run query information which appears on the footer*/
  hideRunQueryText?: boolean;
  /** This is used for applications (such as the inline editing flyout in dashboards)
   * which want to add the editor without being part of the Unified search component
   * It renders a submit query button inside the editor
   */
  editorIsInline?: boolean;
  /** Disables the submit query action*/
  disableSubmitAction?: boolean;

  /** when set to true enables query cancellation **/
  allowQueryCancellation?: boolean;

  /** hide @timestamp info **/
  hideTimeFilterInfo?: boolean;

  /** hide query history **/
  hideQueryHistory?: boolean;
}

interface TextBasedEditorDeps {
  core: CoreStart;
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

// for editor width smaller than this value we want to start hiding some text
const BREAKPOINT_WIDTH = 540;

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
let lines = 1;

export const TextBasedLanguagesEditor = memo(function TextBasedLanguagesEditor({
  query,
  onTextLangQueryChange,
  onTextLangQuerySubmit,
  expandCodeEditor,
  isCodeEditorExpanded,
  detectTimestamp = false,
  errors: serverErrors,
  warning: serverWarning,
  isLoading,
  isDisabled,
  isDarkMode,
  hideMinimizeButton,
  hideRunQueryText,
  editorIsInline,
  disableSubmitAction,
  dataTestSubj,
  allowQueryCancellation,
  hideTimeFilterInfo,
  hideQueryHistory,
}: TextBasedLanguagesEditorProps) {
  const { euiTheme } = useEuiTheme();
  const language = getAggregateQueryMode(query);
  const queryString: string = query[language] ?? '';
  const kibana = useKibana<TextBasedEditorDeps>();
  const { dataViews, expressions, indexManagementApiService, application, docLinks, core } =
    kibana.services;
  const timeZone = core?.uiSettings?.get('dateFormat:tz');
  const [code, setCode] = useState<string>(queryString ?? '');
  const [codeOneLiner, setCodeOneLiner] = useState('');
  // To make server side errors less "sticky", register the state of the code when submitting
  const [codeWhenSubmitted, setCodeStateOnSubmission] = useState(code);
  const [editorHeight, setEditorHeight] = useState(
    isCodeEditorExpanded ? EDITOR_INITIAL_HEIGHT_EXPANDED : EDITOR_INITIAL_HEIGHT
  );
  const [isSpaceReduced, setIsSpaceReduced] = useState(false);
  const [editorWidth, setEditorWidth] = useState(0);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(isCodeEditorExpanded);
  const [isCompactFocused, setIsCompactFocused] = useState(isCodeEditorExpanded);
  const [isCodeEditorExpandedFocused, setIsCodeEditorExpandedFocused] = useState(false);
  const [isQueryLoading, setIsQueryLoading] = useState(true);
  const [abortController, setAbortController] = useState(new AbortController());
  // contains both client side validation and server messages
  const [editorMessages, setEditorMessages] = useState<{
    errors: MonacoMessage[];
    warnings: MonacoMessage[];
  }>({
    errors: serverErrors ? parseErrors(serverErrors, code) : [],
    warnings: serverWarning ? parseWarning(serverWarning) : [],
  });
  // contains only client side validation messages
  const [clientParserMessages, setClientParserMessages] = useState<{
    errors: MonacoMessage[];
    warnings: MonacoMessage[];
  }>({
    errors: [],
    warnings: [],
  });
  const [refetchHistoryItems, setRefetchHistoryItems] = useState(false);

  // as the duration on the history component is being calculated from
  // the isLoading property, if this property is not defined we want
  // to hide the history component
  const hideHistoryComponent = hideQueryHistory || isLoading == null;

  const onQueryUpdate = useCallback(
    (value: string) => {
      setCode(value);
      onTextLangQueryChange({ [language]: value } as AggregateQuery);
    },
    [language, onTextLangQueryChange]
  );

  const onQuerySubmit = useCallback(() => {
    if (isQueryLoading && allowQueryCancellation) {
      abortController?.abort();
      setIsQueryLoading(false);
    } else {
      setIsQueryLoading(true);
      const abc = new AbortController();
      setAbortController(abc);

      const currentValue = editor1.current?.getValue();
      if (currentValue != null) {
        setCodeStateOnSubmission(currentValue);
      }
      onTextLangQuerySubmit({ [language]: currentValue } as AggregateQuery, abc);
    }
  }, [language, onTextLangQuerySubmit, abortController, isQueryLoading, allowQueryCancellation]);

  useEffect(() => {
    if (!isLoading) setIsQueryLoading(false);
  }, [isLoading]);

  const [documentationSections, setDocumentationSections] =
    useState<LanguageDocumentationSections>();

  const codeRef = useRef<string>(code);

  const toggleHistory = useCallback((status: boolean) => {
    setIsHistoryOpen(status);
  }, []);

  // Registers a command to redirect users to the index management page
  // to create a new policy. The command is called by the buildNoPoliciesAvailableDefinition
  monaco.editor.registerCommand('esql.policies.create', (...args) => {
    application?.navigateToApp('management', {
      path: 'data/index_management/enrich_policies/create',
      openInNewTab: true,
    });
  });

  const styles = textBasedLanguagedEditorStyles(
    euiTheme,
    isCompactFocused,
    editorHeight,
    isCodeEditorExpanded,
    Boolean(editorMessages.errors.length),
    Boolean(editorMessages.warnings.length),
    isCodeEditorExpandedFocused,
    Boolean(documentationSections),
    Boolean(editorIsInline),
    isHistoryOpen
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

  const updateHeight = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    if (lines === 1 || clickedOutside || initialRender) return;
    const editorElement = editor.getDomNode();
    const contentHeight = Math.min(MAX_COMPACT_VIEW_LENGTH, editor.getContentHeight());

    if (editorElement) {
      editorElement.style.height = `${contentHeight}px`;
    }
    const contentWidth = Number(editorElement?.style.width.replace('px', ''));
    editor.layout({ width: contentWidth, height: contentHeight });
    setEditorHeight(contentHeight);
  }, []);

  const onEditorFocus = useCallback(() => {
    setIsCompactFocused(true);
    setIsCodeEditorExpandedFocused(true);
    setShowLineNumbers(true);
    setCodeOneLiner('');
    clickedOutside = false;
    initialRender = false;
    updateLinesFromModel = true;
  }, []);

  const { cache: esqlFieldsCache, memoizedFieldsFromESQL } = useMemo(() => {
    // need to store the timing of the first request so we can atomically clear the cache per query
    const fn = memoize(
      (...args: [{ esql: string }, ExpressionsStart, undefined, AbortController?]) => ({
        timestamp: Date.now(),
        result: fetchFieldsFromESQL(...args),
      }),
      ({ esql }) => esql
    );

    return { cache: fn.cache, memoizedFieldsFromESQL: fn };
  }, []);

  const esqlCallbacks: ESQLCallbacks = useMemo(
    () => ({
      getSources: async () => {
        const [remoteIndices, localIndices] = await Promise.all([
          getRemoteIndicesList(dataViews),
          getIndicesList(dataViews),
        ]);
        return [...localIndices, ...remoteIndices];
      },
      getFieldsFor: async ({ query: queryToExecute }: { query?: string } | undefined = {}) => {
        if (queryToExecute) {
          // ES|QL with limit 0 returns only the columns and is more performant
          const esqlQuery = {
            esql: `${queryToExecute} | limit 0`,
          };
          // Check if there's a stale entry and clear it
          clearCacheWhenOld(esqlFieldsCache, esqlQuery.esql);
          try {
            const table = await memoizedFieldsFromESQL(
              esqlQuery,
              expressions,
              undefined,
              abortController
            ).result;
            return table?.columns.map((c) => ({ name: c.name, type: c.meta.type })) || [];
          } catch (e) {
            // no action yet
          }
        }
        return [];
      },
      getMetaFields: async () => ['_version', '_id', '_index', '_source'],
      getPolicies: async () => {
        const { data: policies, error } =
          (await indexManagementApiService?.getAllEnrichPolicies()) || {};
        if (error || !policies) {
          return [];
        }
        return policies.map(({ type, query: policyQuery, ...rest }) => rest);
      },
    }),
    [
      dataViews,
      expressions,
      indexManagementApiService,
      esqlFieldsCache,
      memoizedFieldsFromESQL,
      abortController,
    ]
  );

  const parseMessages = useCallback(async () => {
    if (editorModel.current) {
      return await ESQLLang.validate(editorModel.current, queryString, esqlCallbacks);
    }
    return {
      errors: [],
      warnings: [],
    };
  }, [esqlCallbacks, queryString]);

  useEffect(() => {
    const validateQuery = async () => {
      if (editorModel?.current) {
        const parserMessages = await parseMessages();
        setClientParserMessages({
          errors: parserMessages?.errors ?? [],
          warnings: parserMessages?.warnings ?? [],
        });
      }
    };
    if (isQueryLoading || isLoading) {
      addQueriesToCache({
        queryString,
        timeZone,
      });
      validateQuery();
      setRefetchHistoryItems(false);
    } else {
      updateCachedQueries({
        queryString,
        status: clientParserMessages.errors?.length
          ? 'error'
          : clientParserMessages.warnings.length
          ? 'warning'
          : 'success',
      });

      setRefetchHistoryItems(true);
    }
  }, [clientParserMessages, isLoading, isQueryLoading, parseMessages, queryString, timeZone]);

  const queryValidation = useCallback(
    async ({ active }: { active: boolean }) => {
      if (!editorModel.current || language !== 'esql' || editorModel.current.isDisposed()) return;
      monaco.editor.setModelMarkers(editorModel.current, 'Unified search', []);
      const { warnings: parserWarnings, errors: parserErrors } = await parseMessages();
      const markers = [];

      if (parserErrors.length) {
        markers.push(...parserErrors);
      }
      if (active) {
        setEditorMessages({ errors: parserErrors, warnings: parserWarnings });
        monaco.editor.setModelMarkers(editorModel.current, 'Unified search', markers);
        return;
      }
    },
    [language, parseMessages]
  );

  useDebounceWithOptions(
    async () => {
      if (!editorModel.current) return;
      const subscription = { active: true };
      if (code === codeWhenSubmitted) {
        if (serverErrors || serverWarning) {
          const parsedErrors = parseErrors(serverErrors || [], code);
          const parsedWarning = serverWarning ? parseWarning(serverWarning) : [];
          setEditorMessages({
            errors: parsedErrors,
            warnings: parsedErrors.length ? [] : parsedWarning,
          });
          monaco.editor.setModelMarkers(
            editorModel.current,
            'Unified search',
            parsedErrors.length ? parsedErrors : []
          );
          const parserMessages = await parseMessages();
          setClientParserMessages({
            errors: parserMessages?.errors ?? [],
            warnings: parserMessages?.warnings ?? [],
          });
          return;
        }
      } else {
        queryValidation(subscription).catch((error) => {
          // console.log({ error });
        });
      }
      return () => (subscription.active = false);
    },
    { skipFirstRender: false },
    256,
    [serverErrors, serverWarning, code]
  );

  const suggestionProvider = useMemo(
    () => (language === 'esql' ? ESQLLang.getSuggestionProvider?.(esqlCallbacks) : undefined),
    [language, esqlCallbacks]
  );

  const hoverProvider = useMemo(
    () => (language === 'esql' ? ESQLLang.getHoverProvider?.(esqlCallbacks) : undefined),
    [language, esqlCallbacks]
  );

  const codeActionProvider = useMemo(
    () => (language === 'esql' ? ESQLLang.getCodeActionProvider?.(esqlCallbacks) : undefined),
    [language, esqlCallbacks]
  );

  const onErrorClick = useCallback(({ startLineNumber, startColumn }: MonacoMessage) => {
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
          lines = queryString.split(/\r|\n/).length;
        }
        const text = getInlineEditorText(queryString, Boolean(hasLines));
        const queryLength = text.length;
        const unusedSpace =
          editorMessages.errors.length || editorMessages.warnings.length
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
    [isCompactFocused, queryString, editorMessages]
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

  useEffect(() => {
    // make sure to always update the code in expanded editor when query prop changes
    if (isCodeEditorExpanded && editor1.current?.getValue() !== queryString) {
      setCode(queryString);
    }
  }, [isCodeEditorExpanded, queryString]);

  const linesBreaksButtonsStatus = useMemo(() => {
    const pipes = code?.split('|');
    const pipesWithNewLine = code?.split('\n|');
    return {
      addLineBreaksDisabled: pipes?.length === pipesWithNewLine?.length,
      removeLineBreaksDisabled: pipesWithNewLine?.length === 1,
    };
  }, [code]);

  const onResize = ({ width }: { width: number }) => {
    setIsSpaceReduced(Boolean(editorIsInline && width < BREAKPOINT_WIDTH));
    calculateVisibleCode(width);
    setEditorWidth(width);
    if (editor1.current) {
      editor1.current.layout({ width, height: editorHeight });
    }
  };

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
    wordWrap: 'on',
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
    // this becomes confusing with multiple markers, so quick fixes
    // will be proposed only within the tooltip
    lightbulb: {
      enabled: false,
    },
    readOnly:
      isLoading ||
      isDisabled ||
      Boolean(!isCompactFocused && codeOneLiner && codeOneLiner.includes('...')),
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
            <EuiFlexGroup responsive={false} gutterSize="none" alignItems="center">
              <EuiFlexItem grow={false}>
                <TooltipWrapper
                  tooltipContent={i18n.translate(
                    'textBasedEditor.query.textBasedLanguagesEditor.EnableWordWrapLabel',
                    {
                      defaultMessage: 'Add line breaks on pipes',
                    }
                  )}
                  condition={!linesBreaksButtonsStatus.addLineBreaksDisabled}
                >
                  <EuiButtonIcon
                    iconType="pipeBreaks"
                    color="text"
                    size="s"
                    data-test-subj="TextBasedLangEditor-toggleWordWrap"
                    aria-label={i18n.translate(
                      'textBasedEditor.query.textBasedLanguagesEditor.EnableWordWrapLabel',
                      {
                        defaultMessage: 'Add line breaks on pipes',
                      }
                    )}
                    isDisabled={linesBreaksButtonsStatus.addLineBreaksDisabled}
                    onClick={() => {
                      const updatedCode = getWrappedInPipesCode(code, false);
                      if (code !== updatedCode) {
                        setCode(updatedCode);
                        onTextLangQueryChange({ [language]: updatedCode } as AggregateQuery);
                      }
                    }}
                  />
                </TooltipWrapper>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <TooltipWrapper
                  tooltipContent={i18n.translate(
                    'textBasedEditor.query.textBasedLanguagesEditor.disableWordWrapLabel',
                    {
                      defaultMessage: 'Remove line breaks on pipes',
                    }
                  )}
                  condition={!linesBreaksButtonsStatus.removeLineBreaksDisabled}
                >
                  <EuiButtonIcon
                    iconType="pipeNoBreaks"
                    color="text"
                    size="s"
                    data-test-subj="TextBasedLangEditor-toggleWordWrap"
                    aria-label={i18n.translate(
                      'textBasedEditor.query.textBasedLanguagesEditor.disableWordWrapLabel',
                      {
                        defaultMessage: 'Remove line breaks on pipes',
                      }
                    )}
                    isDisabled={linesBreaksButtonsStatus.removeLineBreaksDisabled}
                    onClick={() => {
                      const updatedCode = getWrappedInPipesCode(code, true);
                      if (code !== updatedCode) {
                        setCode(updatedCode);
                        onTextLangQueryChange({ [language]: updatedCode } as AggregateQuery);
                      }
                    }}
                  />
                </TooltipWrapper>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false} gutterSize="none" alignItems="center">
              <EuiFlexItem grow={false}>
                {documentationSections && (
                  <EuiFlexItem grow={false}>
                    <LanguageDocumentationPopover
                      language={getLanguageDisplayName(String(language))}
                      sections={documentationSections}
                      searchInDescription
                      linkToDocumentation={
                        language === 'esql' ? docLinks?.links?.query?.queryESQL : ''
                      }
                      buttonProps={{
                        color: 'text',
                        size: 's',
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
                      size="s"
                      onClick={() => {
                        expandCodeEditor(false);
                        updateLinesFromModel = false;
                      }}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              )}
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
                    {!isCompactFocused && editorMessages.errors.length > 0 && (
                      <ErrorsWarningsCompactViewPopover
                        items={editorMessages.errors}
                        type="error"
                        onErrorClick={onErrorClick}
                        popoverCSS={styles.errorsBadge}
                      />
                    )}
                    {!isCompactFocused &&
                      editorMessages.warnings.length > 0 &&
                      editorMessages.errors.length === 0 && (
                        <ErrorsWarningsCompactViewPopover
                          items={editorMessages.warnings}
                          type="warning"
                          onErrorClick={onErrorClick}
                          popoverCSS={styles.errorsBadge}
                        />
                      )}
                    <CodeEditor
                      languageId={languageId(language)}
                      value={codeOneLiner || code}
                      options={codeEditorOptions}
                      width="100%"
                      suggestionProvider={suggestionProvider}
                      hoverProvider={{
                        provideHover: (model, position, token) => {
                          if (isCompactFocused || !hoverProvider?.provideHover) {
                            return { contents: [] };
                          }
                          return hoverProvider?.provideHover(model, position, token);
                        },
                      }}
                      codeActions={codeActionProvider}
                      onChange={onQueryUpdate}
                      editorDidMount={(editor) => {
                        editor1.current = editor;
                        const model = editor.getModel();
                        if (model) {
                          editorModel.current = model;
                        }
                        if (isCodeEditorExpanded) {
                          lines = model?.getLineCount() || 1;
                        }

                        editor.onDidChangeModelContent((e) => {
                          if (updateLinesFromModel) {
                            lines = model?.getLineCount() || 1;
                          }
                          const currentPosition = editor.getPosition();
                          const content = editorModel.current?.getValueInRange({
                            startLineNumber: 0,
                            startColumn: 0,
                            endLineNumber: currentPosition?.lineNumber ?? 1,
                            endColumn: currentPosition?.column ?? 1,
                          });
                          if (content) {
                            codeRef.current = content || editor.getValue();
                          }
                        });

                        // this is fixing a bug between the EUIPopover and the monaco editor
                        // when the user clicks the editor, we force it to focus and the onDidFocusEditorText
                        // to fire, the timeout is needed because otherwise it refocuses on the popover icon
                        // and the user needs to click again the editor.
                        // IMPORTANT: The popover needs to be wrapped with the EuiOutsideClickDetector component.
                        editor.onMouseDown(() => {
                          setTimeout(() => {
                            editor.focus();
                          }, 100);
                        });

                        editor.onDidFocusEditorText(() => {
                          onEditorFocus();
                        });

                        editor.onKeyDown(() => {
                          onEditorFocus();
                        });

                        // on CMD/CTRL + Enter submit the query
                        editor.addCommand(
                          // eslint-disable-next-line no-bitwise
                          monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                          onQuerySubmit
                        );
                        if (!isCodeEditorExpanded) {
                          editor.onDidContentSizeChange((e) => {
                            updateHeight(editor);
                          });
                        }
                      }}
                    />
                    {isCompactFocused && !isCodeEditorExpanded && (
                      <EditorFooter
                        lines={lines}
                        styles={{
                          bottomContainer: styles.bottomContainer,
                          historyContainer: styles.historyContainer,
                        }}
                        {...editorMessages}
                        onErrorClick={onErrorClick}
                        runQuery={onQuerySubmit}
                        updateQuery={onQueryUpdate}
                        detectTimestamp={detectTimestamp}
                        editorIsInline={editorIsInline}
                        disableSubmitAction={disableSubmitAction}
                        hideRunQueryText={hideRunQueryText}
                        isSpaceReduced={isSpaceReduced}
                        isLoading={isQueryLoading}
                        allowQueryCancellation={allowQueryCancellation}
                        hideTimeFilterInfo={hideTimeFilterInfo}
                        isHistoryOpen={isHistoryOpen}
                        setIsHistoryOpen={toggleHistory}
                        containerWidth={editorWidth}
                        hideQueryHistory={hideHistoryComponent}
                        refetchHistoryItems={refetchHistoryItems}
                        isInCompactMode={true}
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
                {documentationSections && (
                  <EuiFlexItem grow={false}>
                    <LanguageDocumentationPopover
                      language={
                        String(language) === 'esql' ? 'ES|QL' : String(language).toUpperCase()
                      }
                      linkToDocumentation={
                        language === 'esql' ? docLinks?.links?.query?.queryESQL : ''
                      }
                      searchInDescription
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
                          borderRadius: 0,
                          backgroundColor: isDark ? euiTheme.colors.lightestShade : '#e9edf3',
                          border: '1px solid rgb(17 43 134 / 10%) !important',
                        },
                      }}
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexItem>
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
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                      backgroundColor: isDark ? euiTheme.colors.lightestShade : '#e9edf3',
                      border: '1px solid rgb(17 43 134 / 10%) !important',
                      borderLeft: 'transparent !important',
                    }}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {isCodeEditorExpanded && (
        <EditorFooter
          lines={lines}
          styles={{
            bottomContainer: styles.bottomContainer,
            historyContainer: styles.historyContainer,
          }}
          onErrorClick={onErrorClick}
          runQuery={onQuerySubmit}
          updateQuery={onQueryUpdate}
          detectTimestamp={detectTimestamp}
          hideRunQueryText={hideRunQueryText}
          editorIsInline={editorIsInline}
          disableSubmitAction={disableSubmitAction}
          isSpaceReduced={isSpaceReduced}
          isLoading={isQueryLoading}
          allowQueryCancellation={allowQueryCancellation}
          hideTimeFilterInfo={hideTimeFilterInfo}
          {...editorMessages}
          isHistoryOpen={isHistoryOpen}
          setIsHistoryOpen={toggleHistory}
          containerWidth={editorWidth}
          hideQueryHistory={hideHistoryComponent}
          refetchHistoryItems={refetchHistoryItems}
        />
      )}
      {isCodeEditorExpanded && (
        <ResizableButton
          onMouseDownResizeHandler={onMouseDownResizeHandler}
          onKeyDownResizeHandler={onKeyDownResizeHandler}
          editorIsInline={editorIsInline}
        />
      )}
    </>
  );

  return editorPanel;
});
