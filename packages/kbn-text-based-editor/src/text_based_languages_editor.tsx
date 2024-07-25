/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem, EuiOutsideClickDetector, useEuiTheme } from '@elastic/eui';
import { CodeEditor, CodeEditorProps } from '@kbn/code-editor';
import type { CoreStart } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { AggregateQuery } from '@kbn/es-query';
import { getAggregateQueryMode } from '@kbn/es-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ESQLLang, ESQL_LANG_ID, ESQL_THEME_ID, monaco, type ESQLCallbacks } from '@kbn/monaco';
import memoize from 'lodash/memoize';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { EditorFooter } from './editor_footer';
import { fetchFieldsFromESQL } from './fetch_fields_from_esql';
import {
  clearCacheWhenOld,
  getESQLSources,
  parseErrors,
  parseWarning,
  useDebounceWithOptions,
  type MonacoMessage,
} from './helpers';
import { addQueriesToCache, updateCachedQueries } from './history_local_storage';
import { ResizableButton } from './resizable_button';
import {
  EDITOR_INITIAL_HEIGHT,
  EDITOR_INITIAL_HEIGHT_INLINE_EDITING,
  EDITOR_MAX_HEIGHT,
  EDITOR_MIN_HEIGHT,
  textBasedLanguageEditorStyles,
} from './text_based_languages_editor.styles';
import { getRateLimitedColumnsWithMetadata } from './ecs_metadata_helper';
import type { TextBasedLanguagesEditorProps, TextBasedEditorDeps } from './types';

import './overwrite.scss';

const KEYCODE_ARROW_UP = 38;
const KEYCODE_ARROW_DOWN = 40;

// for editor width smaller than this value we want to start hiding some text
const BREAKPOINT_WIDTH = 540;

let lines = 1;

export const TextBasedLanguagesEditor = memo(function TextBasedLanguagesEditor({
  query,
  onTextLangQueryChange,
  onTextLangQuerySubmit,
  detectedTimestamp,
  errors: serverErrors,
  warning: serverWarning,
  isLoading,
  isDisabled,
  isDarkMode,
  hideRunQueryText,
  editorIsInline,
  disableSubmitAction,
  dataTestSubj,
  allowQueryCancellation,
  hideTimeFilterInfo,
  hideQueryHistory,
  isHelpMenuOpen,
  setIsHelpMenuOpen,
}: TextBasedLanguagesEditorProps) {
  const { euiTheme } = useEuiTheme();
  const language = getAggregateQueryMode(query);
  const queryString: string = query[language] ?? '';
  const kibana = useKibana<TextBasedEditorDeps>();
  const { dataViews, expressions, indexManagementApiService, application, core, fieldsMetadata } =
    kibana.services;
  const timeZone = core?.uiSettings?.get('dateFormat:tz');
  const [code, setCode] = useState<string>(queryString ?? '');
  // To make server side errors less "sticky", register the state of the code when submitting
  const [codeWhenSubmitted, setCodeStateOnSubmission] = useState(code);
  const [editorHeight, setEditorHeight] = useState(
    editorIsInline ? EDITOR_INITIAL_HEIGHT_INLINE_EDITING : EDITOR_INITIAL_HEIGHT
  );

  const [measuredEditorWidth, setMeasuredEditorWidth] = useState(0);
  const [measuredContentWidth, setMeasuredContentWidth] = useState(0);

  const isSpaceReduced = Boolean(editorIsInline) && measuredEditorWidth < BREAKPOINT_WIDTH;

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
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
    if (isQueryLoading && isLoading && allowQueryCancellation) {
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
  }, [
    isQueryLoading,
    isLoading,
    allowQueryCancellation,
    abortController,
    onTextLangQuerySubmit,
    language,
  ]);

  const onCommentLine = useCallback(() => {
    const currentSelection = editor1?.current?.getSelection();
    const startLineNumber = currentSelection?.startLineNumber;
    const endLineNumber = currentSelection?.endLineNumber;
    if (startLineNumber && endLineNumber) {
      for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
        const lineContent = editorModel.current?.getLineContent(lineNumber) ?? '';
        const hasComment = lineContent?.startsWith('//');
        const commentedLine = hasComment ? lineContent?.replace('//', '') : `//${lineContent}`;

        // executeEdits allows to keep edit in history
        editor1.current?.executeEdits('comment', [
          {
            range: {
              startLineNumber: lineNumber,
              startColumn: 0,
              endLineNumber: lineNumber,
              endColumn: (lineContent?.length ?? 0) + 1,
            },
            text: commentedLine,
          },
        ]);
      }
    }
  }, []);

  useEffect(() => {
    if (!isLoading) setIsQueryLoading(false);
  }, [isLoading]);

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

  const styles = textBasedLanguageEditorStyles(
    euiTheme,
    editorHeight,
    Boolean(editorMessages.errors.length),
    Boolean(editorMessages.warnings.length),
    isCodeEditorExpandedFocused,
    Boolean(editorIsInline),
    isHistoryOpen
  );
  const isDark = isDarkMode;
  const editorModel = useRef<monaco.editor.ITextModel>();
  const editor1 = useRef<monaco.editor.IStandaloneCodeEditor>();
  const containerRef = useRef<HTMLElement>(null);

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
  };

  const onEditorFocus = useCallback(() => {
    setIsCodeEditorExpandedFocused(true);
    setShowLineNumbers(true);
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

  const { cache: dataSourcesCache, memoizedSources } = useMemo(() => {
    const fn = memoize(
      (...args: [DataViewsPublicPluginStart, CoreStart]) => ({
        timestamp: Date.now(),
        result: getESQLSources(...args),
      }),
      ({ esql }) => esql
    );

    return { cache: fn.cache, memoizedSources: fn };
  }, []);

  const esqlCallbacks: ESQLCallbacks = useMemo(() => {
    const callbacks: ESQLCallbacks = {
      getSources: async () => {
        clearCacheWhenOld(dataSourcesCache, queryString);
        const sources = await memoizedSources(dataViews, core).result;
        return sources;
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
            const columns = table?.columns.map((c) => ({ name: c.name, type: c.meta.type })) || [];
            return await getRateLimitedColumnsWithMetadata(columns, fieldsMetadata);
          } catch (e) {
            // no action yet
          }
        }
        return [];
      },
      getPolicies: async () => {
        const { data: policies, error } =
          (await indexManagementApiService?.getAllEnrichPolicies()) || {};
        if (error || !policies) {
          return [];
        }
        return policies.map(({ type, query: policyQuery, ...rest }) => rest);
      },
    };
    return callbacks;
  }, [
    queryString,
    memoizedSources,
    dataSourcesCache,
    dataViews,
    core,
    esqlFieldsCache,
    memoizedFieldsFromESQL,
    expressions,
    abortController,
    indexManagementApiService,
    fieldsMetadata,
  ]);

  const parseMessages = useCallback(async () => {
    if (editorModel.current) {
      return await ESQLLang.validate(editorModel.current, queryString, esqlCallbacks);
    }
    return {
      errors: [],
      warnings: [],
    };
  }, [esqlCallbacks, queryString]);

  const clientParserStatus = clientParserMessages.errors?.length
    ? 'error'
    : clientParserMessages.warnings.length
    ? 'warning'
    : 'success';

  useEffect(() => {
    const validateQuery = async () => {
      if (editor1?.current) {
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
        status: clientParserStatus,
      });

      setRefetchHistoryItems(true);
    }
  }, [clientParserStatus, isLoading, isQueryLoading, parseMessages, queryString, timeZone]);

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
      if (code === codeWhenSubmitted && (serverErrors || serverWarning)) {
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
      } else {
        queryValidation(subscription).catch(() => {});
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

  // When the layout changes, and the editor is not focused, we want to
  // recalculate the visible code so it fills up the available space. We
  // use a ref because editorDidMount is only called once, and the reference
  // to the state becomes stale after re-renders.
  const onLayoutChange = (layoutInfoEvent: monaco.editor.EditorLayoutInfo) => {
    if (layoutInfoEvent.contentWidth !== measuredContentWidth) {
      const nextMeasuredWidth = layoutInfoEvent.contentWidth;
      setMeasuredContentWidth(nextMeasuredWidth);
    }

    if (layoutInfoEvent.width !== measuredEditorWidth) {
      setMeasuredEditorWidth(layoutInfoEvent.width);
    }
  };

  const onLayoutChangeRef = useRef(onLayoutChange);

  onLayoutChangeRef.current = onLayoutChange;

  const codeEditorOptions: CodeEditorProps['options'] = {
    accessibilitySupport: 'off',
    autoIndent: 'none',
    automaticLayout: true,
    fixedOverflowWidgets: true,
    folding: false,
    fontSize: 14,
    hideCursorInOverviewRuler: true,
    // this becomes confusing with multiple markers, so quick fixes
    // will be proposed only within the tooltip
    lightbulb: {
      enabled: false,
    },
    lineDecorationsWidth: 12,
    lineNumbers: showLineNumbers ? 'on' : 'off',
    lineNumbersMinChars: 3,
    minimap: { enabled: false },
    overviewRulerLanes: 0,
    overviewRulerBorder: false,
    padding: {
      top: 8,
      bottom: 8,
    },
    quickSuggestions: true,
    readOnly: isDisabled,
    renderLineHighlight: 'line',
    renderLineHighlightOnlyWhenFocus: true,
    scrollbar: {
      horizontal: 'hidden',
      vertical: 'auto',
    },
    scrollBeyondLastLine: false,
    theme: language === 'esql' ? ESQL_THEME_ID : isDark ? 'vs-dark' : 'vs',
    wordWrap: 'on',
    wrappingIndent: 'none',
  };

  codeEditorOptions.overviewRulerLanes = 4;
  codeEditorOptions.hideCursorInOverviewRuler = false;
  codeEditorOptions.overviewRulerBorder = true;

  const editorPanel = (
    <>
      <EuiFlexGroup gutterSize="none" responsive={false} ref={containerRef}>
        <EuiOutsideClickDetector
          onOutsideClick={() => {
            restoreInitialMode();
          }}
        >
          <div css={styles.resizableContainer}>
            <EuiFlexItem
              data-test-subj={dataTestSubj ?? 'TextBasedLangEditor'}
              className="TextBasedLangEditor"
              css={css`
                max-width: 100%;
                position: relative;
              `}
            >
              <div css={styles.editorContainer}>
                <CodeEditor
                  languageId={ESQL_LANG_ID}
                  value={code}
                  options={codeEditorOptions}
                  width="100%"
                  suggestionProvider={suggestionProvider}
                  hoverProvider={{
                    provideHover: (model, position, token) => {
                      if (!hoverProvider?.provideHover) {
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
                    lines = model?.getLineCount() || 1;

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

                    // on CMD/CTRL + / comment out the entire line
                    editor.addCommand(
                      // eslint-disable-next-line no-bitwise
                      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash,
                      onCommentLine
                    );

                    setMeasuredEditorWidth(editor.getLayoutInfo().width);
                    setMeasuredContentWidth(editor.getContentWidth());

                    editor.onDidLayoutChange((layoutInfoEvent) => {
                      onLayoutChangeRef.current(layoutInfoEvent);
                    });
                  }}
                />
              </div>
            </EuiFlexItem>
          </div>
        </EuiOutsideClickDetector>
      </EuiFlexGroup>
      <EditorFooter
        lines={lines}
        styles={{
          bottomContainer: styles.bottomContainer,
          historyContainer: styles.historyContainer,
        }}
        code={code}
        onErrorClick={onErrorClick}
        runQuery={onQuerySubmit}
        updateQuery={onQueryUpdate}
        detectedTimestamp={detectedTimestamp}
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
        measuredContainerWidth={measuredEditorWidth}
        hideQueryHistory={hideHistoryComponent}
        refetchHistoryItems={refetchHistoryItems}
        queryHasChanged={code !== codeWhenSubmitted}
        isHelpMenuOpen={isHelpMenuOpen}
        setIsHelpMenuOpen={setIsHelpMenuOpen}
      />
      <ResizableButton
        onMouseDownResizeHandler={onMouseDownResizeHandler}
        onKeyDownResizeHandler={onKeyDownResizeHandler}
        editorIsInline={editorIsInline}
      />
    </>
  );

  return editorPanel;
});
