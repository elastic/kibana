/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiOutsideClickDetector,
  useEuiTheme,
  EuiDatePicker,
  EuiToolTip,
  EuiButton,
  type EuiButtonColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { isEqual } from 'lodash';
import { CodeEditor, CodeEditorProps } from '@kbn/code-editor';
import type { CoreStart } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ESQLLang, ESQL_LANG_ID, monaco, type ESQLCallbacks } from '@kbn/monaco';
import memoize from 'lodash/memoize';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { css } from '@emotion/react';
import {
  type ESQLRealField,
  ESQLVariableType,
  type ESQLControlVariable,
} from '@kbn/esql-validation-autocomplete';
import { FieldType } from '@kbn/esql-validation-autocomplete/src/definitions/types';
import { EditorFooter } from './editor_footer';
import { fetchFieldsFromESQL } from './fetch_fields_from_esql';
import {
  clearCacheWhenOld,
  getESQLSources,
  parseErrors,
  parseWarning,
  useDebounceWithOptions,
  onKeyDownResizeHandler,
  onMouseDownResizeHandler,
  getEditorOverwrites,
  type MonacoMessage,
} from './helpers';
import { addQueriesToCache } from './history_local_storage';
import { ResizableButton } from './resizable_button';
import {
  EDITOR_INITIAL_HEIGHT,
  EDITOR_INITIAL_HEIGHT_INLINE_EDITING,
  RESIZABLE_CONTAINER_INITIAL_HEIGHT,
  esqlEditorStyles,
} from './esql_editor.styles';
import type { ESQLEditorProps, ESQLEditorDeps } from './types';

// for editor width smaller than this value we want to start hiding some text
const BREAKPOINT_WIDTH = 540;

const triggerControl = async (
  queryString: string,
  variableType: ESQLVariableType,
  position: monaco.Position | null | undefined,
  uiActions: ESQLEditorDeps['uiActions'],
  esqlVariables?: ESQLControlVariable[],
  onSaveControl?: ESQLEditorProps['onSaveControl'],
  onCancelControl?: ESQLEditorProps['onCancelControl']
) => {
  await uiActions.getTrigger('ESQL_CONTROL_TRIGGER').exec({
    queryString,
    variableType,
    cursorPosition: position,
    esqlVariables,
    onSaveControl,
    onCancelControl,
  });
};

export const ESQLEditor = memo(function ESQLEditor({
  query,
  onTextLangQueryChange,
  onTextLangQuerySubmit,
  detectedTimestamp,
  errors: serverErrors,
  warning: serverWarning,
  isLoading,
  isDisabled,
  hideRunQueryText,
  hideRunQueryButton,
  editorIsInline,
  disableSubmitAction,
  dataTestSubj,
  allowQueryCancellation,
  hideTimeFilterInfo,
  hideQueryHistory,
  hasOutline,
  displayDocumentationAsFlyout,
  disableAutoFocus,
  onSaveControl,
  onCancelControl,
  supportsControls,
  esqlVariables,
}: ESQLEditorProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const datePickerOpenStatusRef = useRef<boolean>(false);
  const theme = useEuiTheme();
  const kibana = useKibana<ESQLEditorDeps>();
  const {
    dataViews,
    expressions,
    indexManagementApiService,
    application,
    core,
    fieldsMetadata,
    uiSettings,
    uiActions,
    data,
  } = kibana.services;

  const variablesService = kibana.services?.esql?.variablesService;
  const histogramBarTarget = uiSettings?.get('histogram:barTarget') ?? 50;
  const [code, setCode] = useState<string>(query.esql ?? '');
  // To make server side errors less "sticky", register the state of the code when submitting
  const [codeWhenSubmitted, setCodeStateOnSubmission] = useState(code);
  const [editorHeight, setEditorHeight] = useState(
    editorIsInline ? EDITOR_INITIAL_HEIGHT_INLINE_EDITING : EDITOR_INITIAL_HEIGHT
  );
  // the resizable container is the container that holds the history component or the inline docs
  // they are never open simultaneously
  const [resizableContainerHeight, setResizableContainerHeight] = useState(
    RESIZABLE_CONTAINER_INITIAL_HEIGHT
  );
  const [popoverPosition, setPopoverPosition] = useState<{ top?: number; left?: number }>({});
  const [timePickerDate, setTimePickerDate] = useState(moment());
  const [measuredEditorWidth, setMeasuredEditorWidth] = useState(0);

  const isSpaceReduced = Boolean(editorIsInline) && measuredEditorWidth < BREAKPOINT_WIDTH;

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLanguageComponentOpen, setIsLanguageComponentOpen] = useState(false);
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
  const onQueryUpdate = useCallback(
    (value: string) => {
      onTextLangQueryChange({ esql: value } as AggregateQuery);
    },
    [onTextLangQueryChange]
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
      onTextLangQuerySubmit({ esql: currentValue } as AggregateQuery, abc);
    }
  }, [isQueryLoading, isLoading, allowQueryCancellation, abortController, onTextLangQuerySubmit]);

  const onCommentLine = useCallback(() => {
    const currentSelection = editor1?.current?.getSelection();
    const startLineNumber = currentSelection?.startLineNumber;
    const endLineNumber = currentSelection?.endLineNumber;
    const edits = [];
    if (startLineNumber && endLineNumber) {
      for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
        const lineContent = editorModel.current?.getLineContent(lineNumber) ?? '';
        const hasComment = lineContent?.startsWith('//');
        const commentedLine = hasComment ? lineContent?.replace('//', '') : `//${lineContent}`;

        edits.push({
          range: {
            startLineNumber: lineNumber,
            startColumn: 0,
            endLineNumber: lineNumber,
            endColumn: (lineContent?.length ?? 0) + 1,
          },
          text: commentedLine,
        });
      }
      // executeEdits allows to keep edit in history
      editor1.current?.executeEdits('comment', edits);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) setIsQueryLoading(false);
  }, [isLoading]);

  useEffect(() => {
    if (editor1.current) {
      if (code !== query.esql) {
        setCode(query.esql);
      }
    }
  }, [code, query.esql]);

  // Enable the variables service if the feature is supported in the consumer app
  useEffect(() => {
    if (supportsControls) {
      variablesService?.enableSuggestions();

      const variables = variablesService?.esqlVariables;
      if (!isEqual(variables, esqlVariables)) {
        variablesService?.clearVariables();
        esqlVariables?.forEach((variable) => {
          variablesService?.addVariable(variable);
        });
      }
    } else {
      variablesService?.disableSuggestions();
    }
  }, [variablesService, supportsControls, esqlVariables]);

  const toggleHistory = useCallback((status: boolean) => {
    setIsHistoryOpen(status);
  }, []);

  const showSuggestionsIfEmptyQuery = useCallback(() => {
    if (editorModel.current?.getValueLength() === 0) {
      setImmediate(() => {
        editor1.current?.trigger(undefined, 'editor.action.triggerSuggest', {});
      });
    }
  }, []);

  const openTimePickerPopover = useCallback(() => {
    const currentCursorPosition = editor1.current?.getPosition();
    const editorCoords = editor1.current?.getDomNode()!.getBoundingClientRect();
    if (currentCursorPosition && editorCoords) {
      const editorPosition = editor1.current!.getScrolledVisiblePosition(currentCursorPosition);
      const editorTop = editorCoords.top;
      const editorLeft = editorCoords.left;

      // Calculate the absolute position of the popover
      const absoluteTop = editorTop + (editorPosition?.top ?? 0) + 20;
      const absoluteLeft = editorLeft + (editorPosition?.left ?? 0);

      setPopoverPosition({ top: absoluteTop, left: absoluteLeft });
      datePickerOpenStatusRef.current = true;
      popoverRef.current?.focus();
    }
  }, []);

  // Registers a command to redirect users to the index management page
  // to create a new policy. The command is called by the buildNoPoliciesAvailableDefinition
  monaco.editor.registerCommand('esql.policies.create', (...args) => {
    application?.navigateToApp('management', {
      path: 'data/index_management/enrich_policies/create',
      openInNewTab: true,
    });
  });

  monaco.editor.registerCommand('esql.timepicker.choose', (...args) => {
    openTimePickerPopover();
  });

  monaco.editor.registerCommand('esql.control.time_literal.create', async (...args) => {
    const position = editor1.current?.getPosition();
    await triggerControl(
      query.esql,
      ESQLVariableType.TIME_LITERAL,
      position,
      uiActions,
      esqlVariables,
      onSaveControl,
      onCancelControl
    );
  });

  monaco.editor.registerCommand('esql.control.fields.create', async (...args) => {
    const position = editor1.current?.getPosition();
    await triggerControl(
      query.esql,
      ESQLVariableType.FIELDS,
      position,
      uiActions,
      esqlVariables,
      onSaveControl,
      onCancelControl
    );
  });

  monaco.editor.registerCommand('esql.control.values.create', async (...args) => {
    const position = editor1.current?.getPosition();
    await triggerControl(
      query.esql,
      ESQLVariableType.VALUES,
      position,
      uiActions,
      esqlVariables,
      onSaveControl,
      onCancelControl
    );
  });

  monaco.editor.registerCommand('esql.control.functions.create', async (...args) => {
    const position = editor1.current?.getPosition();
    await triggerControl(
      query.esql,
      ESQLVariableType.FUNCTIONS,
      position,
      uiActions,
      esqlVariables,
      onSaveControl,
      onCancelControl
    );
  });

  const styles = esqlEditorStyles(
    theme.euiTheme,
    editorHeight,
    Boolean(editorMessages.errors.length),
    Boolean(editorMessages.warnings.length),
    isCodeEditorExpandedFocused,
    Boolean(editorIsInline),
    Boolean(hasOutline)
  );
  const editorModel = useRef<monaco.editor.ITextModel>();
  const editor1 = useRef<monaco.editor.IStandaloneCodeEditor>();
  const containerRef = useRef<HTMLElement>(null);

  const onMouseDownResize = useCallback<typeof onMouseDownResizeHandler>(
    (
      mouseDownEvent,
      firstPanelHeight,
      setFirstPanelHeight,
      secondPanelHeight,
      setSecondPanelHeight
    ) => {
      onMouseDownResizeHandler(
        mouseDownEvent,
        firstPanelHeight,
        setFirstPanelHeight,
        secondPanelHeight,
        setSecondPanelHeight
      );
    },
    []
  );

  const onKeyDownResize = useCallback<typeof onKeyDownResizeHandler>(
    (
      keyDownEvent,
      firstPanelHeight,
      setFirstPanelHeight,
      secondPanelHeight,
      setSecondPanelHeight
    ) => {
      onKeyDownResizeHandler(
        keyDownEvent,
        firstPanelHeight,
        setFirstPanelHeight,
        secondPanelHeight,
        setSecondPanelHeight
      );
    },
    []
  );

  const resizableContainerButton = useMemo(() => {
    return (
      <ResizableButton
        onMouseDownResizeHandler={(mouseDownEvent) =>
          onMouseDownResize(mouseDownEvent, editorHeight, setEditorHeight, undefined, undefined)
        }
        onKeyDownResizeHandler={(keyDownEvent) =>
          onKeyDownResize(keyDownEvent, editorHeight, setEditorHeight, undefined, undefined)
        }
      />
    );
  }, [onMouseDownResize, editorHeight, onKeyDownResize]);

  const onEditorFocus = useCallback(() => {
    setIsCodeEditorExpandedFocused(true);
    showSuggestionsIfEmptyQuery();
  }, [showSuggestionsIfEmptyQuery]);

  const { cache: esqlFieldsCache, memoizedFieldsFromESQL } = useMemo(() => {
    // need to store the timing of the first request so we can atomically clear the cache per query
    const fn = memoize(
      (...args: [{ esql: string }, ExpressionsStart, TimeRange, AbortController?]) => ({
        timestamp: Date.now(),
        result: fetchFieldsFromESQL(...args),
      }),
      ({ esql }) => esql
    );

    return { cache: fn.cache, memoizedFieldsFromESQL: fn };
  }, []);

  const { cache: dataSourcesCache, memoizedSources } = useMemo(() => {
    const fn = memoize((...args: [DataViewsPublicPluginStart, CoreStart]) => ({
      timestamp: Date.now(),
      result: getESQLSources(...args),
    }));

    return { cache: fn.cache, memoizedSources: fn };
  }, []);

  const esqlCallbacks: ESQLCallbacks = useMemo(() => {
    const callbacks: ESQLCallbacks = {
      getSources: async () => {
        clearCacheWhenOld(dataSourcesCache, query.esql);
        const sources = await memoizedSources(dataViews, core).result;
        return sources;
      },
      getColumnsFor: async ({ query: queryToExecute }: { query?: string } | undefined = {}) => {
        if (queryToExecute) {
          // ES|QL with limit 0 returns only the columns and is more performant
          const esqlQuery = {
            esql: `${queryToExecute} | limit 0`,
          };
          // Check if there's a stale entry and clear it
          clearCacheWhenOld(esqlFieldsCache, esqlQuery.esql);
          const timeRange = data.query.timefilter.timefilter.getTime();
          try {
            const table = await memoizedFieldsFromESQL(
              esqlQuery,
              expressions,
              timeRange,
              abortController
            ).result;
            const columns: ESQLRealField[] =
              table?.columns.map((c) => {
                return {
                  name: c.name,
                  type: c.meta.esType as FieldType,
                };
              }) || [];

            return columns;
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
      getPreferences: async () => {
        return {
          histogramBarTarget,
        };
      },
      // @ts-expect-error To prevent circular type import, type defined here is partial of full client
      getFieldsMetadata: fieldsMetadata?.getClient(),
      getVariablesByType: (type: ESQLVariableType) => {
        return variablesService?.esqlVariables.filter((variable) => variable.type === type);
      },
      canSuggestVariables: () => {
        return variablesService?.areSuggestionsEnabled ?? false;
      },
      getJoinIndices: kibana.services?.esql?.getJoinIndicesAutocomplete,
    };
    return callbacks;
  }, [
    fieldsMetadata,
    kibana.services?.esql?.getJoinIndicesAutocomplete,
    dataSourcesCache,
    query.esql,
    memoizedSources,
    dataViews,
    core,
    esqlFieldsCache,
    data.query.timefilter.timefilter,
    memoizedFieldsFromESQL,
    expressions,
    abortController,
    indexManagementApiService,
    histogramBarTarget,
    variablesService?.esqlVariables,
    variablesService?.areSuggestionsEnabled,
  ]);

  const queryRunButtonProperties = useMemo(() => {
    if (allowQueryCancellation && isLoading) {
      return {
        label: i18n.translate('esqlEditor.query.cancel', {
          defaultMessage: 'Cancel',
        }),
        iconType: 'cross',
        color: 'text',
      };
    }
    if (code !== codeWhenSubmitted) {
      return {
        label: i18n.translate('esqlEditor.query.runQuery', {
          defaultMessage: 'Run query',
        }),
        iconType: 'play',
        color: 'success',
      };
    }
    return {
      label: i18n.translate('esqlEditor.query.refreshLabel', {
        defaultMessage: 'Refresh',
      }),
      iconType: 'refresh',
      color: 'primary',
    };
  }, [allowQueryCancellation, code, codeWhenSubmitted, isLoading]);

  const parseMessages = useCallback(async () => {
    if (editorModel.current) {
      return await ESQLLang.validate(editorModel.current, code, esqlCallbacks);
    }
    return {
      errors: [],
      warnings: [],
    };
  }, [esqlCallbacks, code]);

  useEffect(() => {
    const setQueryToTheCache = async () => {
      if (editor1?.current) {
        const parserMessages = await parseMessages();
        const clientParserStatus = parserMessages.errors?.length
          ? 'error'
          : parserMessages.warnings.length
          ? 'warning'
          : 'success';

        addQueriesToCache({
          queryString: code,
          status: clientParserStatus,
        });
      }
    };
    if (isQueryLoading || isLoading) {
      setQueryToTheCache();
    }
  }, [isLoading, isQueryLoading, parseMessages, code]);

  const queryValidation = useCallback(
    async ({ active }: { active: boolean }) => {
      if (!editorModel.current || editorModel.current.isDisposed()) return;
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
    [parseMessages]
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
    () => ESQLLang.getSuggestionProvider?.(esqlCallbacks),
    [esqlCallbacks]
  );

  const hoverProvider = useMemo(() => ESQLLang.getHoverProvider?.(esqlCallbacks), [esqlCallbacks]);

  const codeActionProvider = useMemo(
    () => ESQLLang.getCodeActionProvider?.(esqlCallbacks),
    [esqlCallbacks]
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
    if (layoutInfoEvent.width !== measuredEditorWidth) {
      setMeasuredEditorWidth(layoutInfoEvent.width);
    }
  };

  const onLayoutChangeRef = useRef(onLayoutChange);

  onLayoutChangeRef.current = onLayoutChange;

  const codeEditorOptions: CodeEditorProps['options'] = {
    hover: {
      above: false,
    },
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
    lineDecorationsWidth: 20,
    lineNumbers: 'on',
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
      horizontalScrollbarSize: 6,
      vertical: 'auto',
      verticalScrollbarSize: 6,
    },
    scrollBeyondLastLine: false,
    theme: ESQL_LANG_ID,
    wordWrap: 'on',
    wrappingIndent: 'none',
  };

  const editorPanel = (
    <>
      {Boolean(editorIsInline) && !hideRunQueryButton && (
        <EuiFlexGroup
          gutterSize="none"
          responsive={false}
          justifyContent="flexEnd"
          css={css`
            padding: ${theme.euiTheme.size.s};
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiToolTip
              position="top"
              content={i18n.translate('esqlEditor.query.runQuery', {
                defaultMessage: 'Run query',
              })}
            >
              <EuiButton
                color={queryRunButtonProperties.color as EuiButtonColor}
                onClick={onQuerySubmit}
                iconType={queryRunButtonProperties.iconType}
                size="s"
                isLoading={isLoading && !allowQueryCancellation}
                isDisabled={Boolean(disableSubmitAction && !allowQueryCancellation)}
                data-test-subj="ESQLEditor-run-query-button"
                aria-label={queryRunButtonProperties.label}
              >
                {queryRunButtonProperties.label}
              </EuiButton>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiFlexGroup gutterSize="none" responsive={false} ref={containerRef}>
        <EuiOutsideClickDetector
          onOutsideClick={() => {
            setIsCodeEditorExpandedFocused(false);
          }}
        >
          <div css={styles.resizableContainer}>
            <EuiFlexItem
              data-test-subj={dataTestSubj ?? 'ESQLEditor'}
              className="ESQLEditor"
              css={css`
                max-width: 100%;
                position: relative;
              `}
            >
              <div css={styles.editorContainer}>
                <CodeEditor
                  languageId={ESQL_LANG_ID}
                  classNameCss={getEditorOverwrites(theme)}
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
                    // this is fixing a bug between the EUIPopover and the monaco editor
                    // when the user clicks the editor, we force it to focus and the onDidFocusEditorText
                    // to fire, the timeout is needed because otherwise it refocuses on the popover icon
                    // and the user needs to click again the editor.
                    // IMPORTANT: The popover needs to be wrapped with the EuiOutsideClickDetector component.
                    editor.onMouseDown(() => {
                      setTimeout(() => {
                        editor.focus();
                      }, 100);
                      if (datePickerOpenStatusRef.current) {
                        setPopoverPosition({});
                      }
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
                    editor.onDidLayoutChange((layoutInfoEvent) => {
                      onLayoutChangeRef.current(layoutInfoEvent);
                    });

                    editor.onDidChangeModelContent(showSuggestionsIfEmptyQuery);

                    // Auto-focus the editor and move the cursor to the end.
                    if (!disableAutoFocus) {
                      editor.focus();
                      editor.setPosition({ column: Infinity, lineNumber: Infinity });
                    }
                  }}
                />
              </div>
            </EuiFlexItem>
          </div>
        </EuiOutsideClickDetector>
      </EuiFlexGroup>
      {(isHistoryOpen || (isLanguageComponentOpen && editorIsInline)) && (
        <ResizableButton
          onMouseDownResizeHandler={(mouseDownEvent) => {
            onMouseDownResize(
              mouseDownEvent,
              editorHeight,
              setEditorHeight,
              resizableContainerHeight,
              setResizableContainerHeight
            );
          }}
          onKeyDownResizeHandler={(keyDownEvent) =>
            onKeyDownResize(
              keyDownEvent,
              editorHeight,
              setEditorHeight,
              resizableContainerHeight,
              setResizableContainerHeight
            )
          }
        />
      )}
      <EditorFooter
        lines={editorModel.current?.getLineCount() || 1}
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
        isSpaceReduced={isSpaceReduced}
        hideTimeFilterInfo={hideTimeFilterInfo}
        {...editorMessages}
        isHistoryOpen={isHistoryOpen}
        setIsHistoryOpen={toggleHistory}
        isLanguageComponentOpen={isLanguageComponentOpen}
        setIsLanguageComponentOpen={setIsLanguageComponentOpen}
        measuredContainerWidth={measuredEditorWidth}
        hideQueryHistory={hideQueryHistory}
        resizableContainerButton={resizableContainerButton}
        resizableContainerHeight={resizableContainerHeight}
        displayDocumentationAsFlyout={displayDocumentationAsFlyout}
      />
      {createPortal(
        Object.keys(popoverPosition).length !== 0 && popoverPosition.constructor === Object && (
          <div
            tabIndex={0}
            style={{
              ...popoverPosition,
              backgroundColor: theme.euiTheme.colors.emptyShade,
              borderRadius: theme.euiTheme.border.radius.small,
              position: 'absolute',
              overflow: 'auto',
            }}
            ref={popoverRef}
            data-test-subj="ESQLEditor-timepicker-popover"
          >
            <EuiDatePicker
              selected={timePickerDate}
              autoFocus
              onChange={(date) => {
                if (date) {
                  setTimePickerDate(date);
                }
              }}
              onSelect={(date, event) => {
                if (date && event) {
                  const currentCursorPosition = editor1.current?.getPosition();
                  const lineContent = editorModel.current?.getLineContent(
                    currentCursorPosition?.lineNumber ?? 0
                  );
                  const contentAfterCursor = lineContent?.substring(
                    (currentCursorPosition?.column ?? 0) - 1,
                    lineContent.length + 1
                  );

                  const addition = `"${date.toISOString()}"${contentAfterCursor}`;
                  editor1.current?.executeEdits('time', [
                    {
                      range: {
                        startLineNumber: currentCursorPosition?.lineNumber ?? 0,
                        startColumn: currentCursorPosition?.column ?? 0,
                        endLineNumber: currentCursorPosition?.lineNumber ?? 0,
                        endColumn: (currentCursorPosition?.column ?? 0) + addition.length + 1,
                      },
                      text: addition,
                      forceMoveMarkers: true,
                    },
                  ]);

                  setPopoverPosition({});

                  datePickerOpenStatusRef.current = false;

                  // move the cursor past the date we just inserted
                  editor1.current?.setPosition({
                    lineNumber: currentCursorPosition?.lineNumber ?? 0,
                    column: (currentCursorPosition?.column ?? 0) + addition.length - 1,
                  });
                  // restore focus to the editor
                  editor1.current?.focus();
                }
              }}
              inline
              showTimeSelect={true}
              shadow={true}
            />
          </div>
        ),
        document.body
      )}
    </>
  );

  return editorPanel;
});
