/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiDatePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiOutsideClickDetector,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
  type EuiButtonColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { isEqual, memoize } from 'lodash';
import { Global, css } from '@emotion/react';
import {
  getIndexPatternFromESQLQuery,
  getESQLSources,
  getEsqlColumns,
  getEsqlPolicies,
  getJoinIndices,
  getTimeseriesIndices,
  getInferenceEndpoints,
  getEditorExtensions,
  fixESQLQueryWithVariables,
  prettifyQuery,
  hasOnlySourceCommand,
} from '@kbn/esql-utils';
import type { CodeEditorProps } from '@kbn/code-editor';
import { CodeEditor } from '@kbn/code-editor';
import type { CoreStart } from '@kbn/core/public';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import type {
  ESQLTelemetryCallbacks,
  ESQLControlVariable,
  ESQLCallbacks,
  TelemetryQuerySubmittedProps,
} from '@kbn/esql-types';
import { FavoritesClient } from '@kbn/content-management-favorites-public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ILicense } from '@kbn/licensing-types';
import { ESQLLang, ESQL_LANG_ID, monaco } from '@kbn/monaco';
import type { MonacoMessage } from '@kbn/monaco/src/languages/esql/language';
import type { ComponentProps } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { createPortal } from 'react-dom';
import useObservable from 'react-use/lib/useObservable';
import { QuerySource } from '@kbn/esql-types';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { useCanCreateLookupIndex, useLookupIndexCommand } from './lookup_join';
import { EditorFooter } from './editor_footer';
import { QuickSearchVisor } from './editor_visor';
import {
  EDITOR_INITIAL_HEIGHT,
  EDITOR_INITIAL_HEIGHT_INLINE_EDITING,
  EDITOR_MAX_HEIGHT,
  RESIZABLE_CONTAINER_INITIAL_HEIGHT,
  esqlEditorStyles,
} from './esql_editor.styles';
import { ESQLEditorTelemetryService } from './telemetry/telemetry_service';
import {
  clearCacheWhenOld,
  filterDataErrors,
  filterOutWarningsOverlappingWithErrors,
  getEditorOverwrites,
  onKeyDownResizeHandler,
  onMouseDownResizeHandler,
  parseErrors,
  parseWarning,
  useDebounceWithOptions,
} from './helpers';
import {
  useInitLatencyTracking,
  useInputLatencyTracking,
  useSuggestionsLatencyTracking,
  useValidationLatencyTracking,
} from './use_latency_tracking';
import { addQueriesToCache } from './history_local_storage';
import { ResizableButton } from './resizable_button';
import { useRestorableState, withRestorableState } from './restorable_state';
import { getHistoryItems } from './history_local_storage';
import type { StarredQueryMetadata } from './editor_footer/esql_starred_queries_service';
import type { ESQLEditorDeps, ESQLEditorProps as ESQLEditorPropsInternal } from './types';
import {
  registerCustomCommands,
  addEditorKeyBindings,
  addTabKeybindingRules,
} from './custom_editor_commands';

// for editor width smaller than this value we want to start hiding some text
const BREAKPOINT_WIDTH = 540;
const DATEPICKER_WIDTH = 373;

// React.memo is applied inside the withRestorableState HOC (called below)
const ESQLEditorInternal = function ESQLEditor({
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
  controlsContext,
  esqlVariables,
  onOpenQueryInNewTab,
  expandToFitQueryOnMount,
  dataErrorsControl,
  formLabel,
  mergeExternalMessages,
  hideQuickSearch,
  openVisorOnSourceCommands,
}: ESQLEditorPropsInternal) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const editorModel = useRef<monaco.editor.ITextModel>();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();
  const containerRef = useRef<HTMLElement>(null);

  const editorCommandDisposables = useRef(
    new WeakMap<monaco.editor.IStandaloneCodeEditor, monaco.IDisposable[]>()
  );

  const sessionIdRef = useRef<string>(uuidv4());
  const interactionIdRef = useRef(0);

  const datePickerOpenStatusRef = useRef<boolean>(false);
  const isFirstFocusRef = useRef<boolean>(true);
  const theme = useEuiTheme();
  const kibana = useKibana<ESQLEditorDeps>();
  const { application, core, fieldsMetadata, uiSettings, uiActions, data, usageCollection } =
    kibana.services;

  const favoritesClient = useMemo(
    () =>
      new FavoritesClient<StarredQueryMetadata>('esql_editor', 'esql_query', {
        http: core.http,
        userProfile: core.userProfile,
        usageCollection,
      }),
    [core.http, core.userProfile, usageCollection]
  );

  const activeSolutionId = useObservable(core.chrome.getActiveSolutionNavId$());

  const telemetryService = useMemo(
    () => new ESQLEditorTelemetryService(core.analytics),
    [core.analytics]
  );

  const fixedQuery = useMemo(
    () => fixESQLQueryWithVariables(query.esql, esqlVariables),
    [esqlVariables, query.esql]
  );

  const variablesService = kibana.services?.esql?.variablesService;
  const histogramBarTarget = uiSettings?.get('histogram:barTarget') ?? 50;
  const [code, setCode] = useState<string>(fixedQuery ?? '');
  // To make server side errors less "sticky", register the state of the code when submitting
  const [codeWhenSubmitted, setCodeStateOnSubmission] = useState(code);
  const [editorHeight, setEditorHeight] = useRestorableState(
    'editorHeight',
    editorIsInline ? EDITOR_INITIAL_HEIGHT_INLINE_EDITING : EDITOR_INITIAL_HEIGHT
  );
  // the resizable container is the container that holds the history component or the inline docs
  // they are never open simultaneously
  const [resizableContainerHeight, setResizableContainerHeight] = useRestorableState(
    'resizableContainerHeight',
    RESIZABLE_CONTAINER_INITIAL_HEIGHT
  );
  const [popoverPosition, setPopoverPosition] = useState<{ top?: number; left?: number }>({});
  const [timePickerDate, setTimePickerDate] = useState(moment());
  const [measuredEditorWidth, setMeasuredEditorWidth] = useState(0);

  const isSpaceReduced = Boolean(editorIsInline) && measuredEditorWidth < BREAKPOINT_WIDTH;

  const [isHistoryOpen, setIsHistoryOpen] = useRestorableState('isHistoryOpen', false);
  const [isLanguageComponentOpen, setIsLanguageComponentOpen] = useState(false);
  const [isCodeEditorExpandedFocused, setIsCodeEditorExpandedFocused] = useState(false);
  const [isQueryLoading, setIsQueryLoading] = useState(true);
  const [abortController, setAbortController] = useState(new AbortController());
  const [isVisorOpen, setIsVisorOpen] = useState(false);

  // Refs for dynamic dependencies that commands need to access
  const esqlVariablesRef = useRef(esqlVariables);
  const controlsContextRef = useRef(controlsContext);
  const isVisorOpenRef = useRef(isVisorOpen);
  const hasOpenedVisorOnMount = useRef(false);

  // contains both client side validation and server messages
  const [editorMessages, setEditorMessages] = useState<{
    errors: MonacoMessage[];
    warnings: MonacoMessage[];
  }>({
    errors: serverErrors ? parseErrors(serverErrors, code) : [],
    warnings: serverWarning ? parseWarning(serverWarning) : [],
  });

  // Open visor on initial render if query has only source commands
  useEffect(() => {
    if (
      openVisorOnSourceCommands &&
      !hasOpenedVisorOnMount.current &&
      code &&
      hasOnlySourceCommand(code)
    ) {
      setIsVisorOpen(true);
      hasOpenedVisorOnMount.current = true;
    }
  }, [code, openVisorOnSourceCommands]);

  const onQueryUpdate = useCallback(
    (value: string) => {
      onTextLangQueryChange({ esql: value } as AggregateQuery);
      setIsVisorOpen(false);
    },
    [onTextLangQueryChange]
  );

  const { onSuggestionsReady, resetSuggestionsTracking } = useSuggestionsLatencyTracking({
    telemetryService,
    sessionIdRef,
    interactionIdRef,
  });

  const { trackInputLatencyOnKeystroke, reportInputLatency } = useInputLatencyTracking({
    telemetryService,
    sessionIdRef,
    interactionIdRef,
  });

  const { trackValidationLatencyStart, trackValidationLatencyEnd, resetValidationTracking } =
    useValidationLatencyTracking({
      telemetryService,
      sessionIdRef,
      interactionIdRef,
    });

  const { reportInitLatency } = useInitLatencyTracking({ telemetryService, sessionIdRef });

  const resetPendingTracking = useCallback(() => {
    resetValidationTracking();
    resetSuggestionsTracking();
  }, [resetValidationTracking, resetSuggestionsTracking]);

  const onQuerySubmit = useCallback(
    (source: TelemetryQuerySubmittedProps['source']) => {
      if (isQueryLoading && isLoading && allowQueryCancellation) {
        abortController?.abort();
        setIsQueryLoading(false);
      } else {
        setIsQueryLoading(true);
        const abc = new AbortController();
        setAbortController(abc);

        const currentValue = editorRef.current?.getValue();
        if (currentValue != null) {
          setCodeStateOnSubmission(currentValue);
        }

        if (currentValue) {
          telemetryService.trackQuerySubmitted({
            source,
            query: currentValue,
          });
        }
        onTextLangQuerySubmit({ esql: currentValue } as AggregateQuery, abc);
      }
    },
    [
      isQueryLoading,
      isLoading,
      allowQueryCancellation,
      abortController,
      onTextLangQuerySubmit,
      telemetryService,
    ]
  );

  const onUpdateAndSubmitQuery = useCallback(
    (newQuery: string, querySource: QuerySource) => {
      // notify telemetry that a query has been submitted from the history panel
      if (querySource === QuerySource.HISTORY || querySource === QuerySource.STARRED) {
        telemetryService.trackQueryHistoryClicked(querySource === QuerySource.STARRED);
      }
      // update the query first
      onQueryUpdate(newQuery);
      setTimeout(() => {
        onQuerySubmit(querySource);
      }, 0);
    },
    [onQuerySubmit, onQueryUpdate, telemetryService]
  );

  const onPrettifyQuery = useCallback(() => {
    const qs = editorRef.current?.getValue();
    if (qs) {
      const prettyCode = prettifyQuery(qs);
      if (qs !== prettyCode) {
        onQueryUpdate(prettyCode);
      }
    }
  }, [onQueryUpdate]);

  const onCommentLine = useCallback(() => {
    const currentSelection = editorRef?.current?.getSelection();
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
      editorRef.current?.executeEdits('comment', edits);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) setIsQueryLoading(false);
  }, [isLoading]);

  // Measure keystroke to React commit by waiting for the code state update.
  useEffect(() => {
    reportInputLatency();
  }, [code, reportInputLatency]);

  useEffect(() => {
    if (editorRef.current) {
      if (code !== fixedQuery) {
        setCode(fixedQuery);
      }
    }
  }, [code, fixedQuery]);

  // If variables are passed to the editor, sync them with the variables service.
  // This ensures that the latest variables are always available for suggestions.
  // The "Create control" suggestion is also enabled/disabled here based on the supportsControls flag
  useEffect(() => {
    const variables = variablesService?.esqlVariables;
    if (!isEqual(variables, esqlVariables)) {
      variablesService?.clearVariables();
      esqlVariables?.forEach((variable) => {
        variablesService?.addVariable(variable);
      });
    }
    // Enable or disable suggestions based on whether Create control suggestion is supported
    if (controlsContext?.supportsControls) {
      variablesService?.enableCreateControlSuggestion();
    } else {
      variablesService?.disableCreateControlSuggestion();
    }
  }, [variablesService, controlsContext, esqlVariables]);

  // Update refs used for the custom commands
  useEffect(() => {
    esqlVariablesRef.current = esqlVariables;
    controlsContextRef.current = controlsContext;
    isVisorOpenRef.current = isVisorOpen;
  }, [esqlVariables, controlsContext, isVisorOpen]);

  const triggerSuggestions = useCallback(() => {
    setTimeout(() => {
      editorRef.current?.trigger(undefined, 'editor.action.triggerSuggest', {});
    }, 0);
  }, []);

  const maybeTriggerSuggestions = useCallback(() => {
    const { current: editor } = editorRef;
    const { current: model } = editorModel;

    if (!editor || !model) {
      return;
    }

    const position = editor.getPosition();
    if (!position) {
      return;
    }

    const { lineNumber, column } = position;
    const lineContent = model.getLineContent(lineNumber);
    const spaceHasBeenTyped = column > 1 && lineContent[column - 2] === ' ';
    const inlineCastHasBeenTyped = lineContent.substring(0, column - 1).endsWith('::');

    if (spaceHasBeenTyped || inlineCastHasBeenTyped) {
      triggerSuggestions();
    }
  }, [triggerSuggestions]);

  const openTimePickerPopover = useCallback(() => {
    const currentCursorPosition = editorRef.current?.getPosition();
    const editorCoords = editorRef.current?.getDomNode()!.getBoundingClientRect();
    if (currentCursorPosition && editorCoords) {
      const editorPosition = editorRef.current!.getScrolledVisiblePosition(currentCursorPosition);
      const editorTop = editorCoords.top;
      const editorLeft = editorCoords.left;

      // Calculate the absolute position of the popover
      const absoluteTop = editorTop + (editorPosition?.top ?? 0) + 25;
      let absoluteLeft = editorLeft + (editorPosition?.left ?? 0);
      if (absoluteLeft > editorCoords.width) {
        // date picker is out of the editor
        absoluteLeft = absoluteLeft - DATEPICKER_WIDTH;
      }

      // Set time picker date to the nearest half hour
      setTimePickerDate(
        moment()
          .minute(Math.round(moment().minute() / 30) * 30)
          .second(0)
          .millisecond(0)
      );

      setPopoverPosition({ top: absoluteTop, left: absoluteLeft });
      datePickerOpenStatusRef.current = true;
      popoverRef.current?.focus();
    }
  }, []);

  const styles = esqlEditorStyles(
    theme.euiTheme,
    editorHeight,
    Boolean(editorMessages.errors.length),
    Boolean(editorMessages.warnings.length),
    isCodeEditorExpandedFocused,
    Boolean(editorIsInline),
    Boolean(hasOutline)
  );

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
  }, [onMouseDownResize, editorHeight, onKeyDownResize, setEditorHeight]);

  const { cache: esqlFieldsCache, memoizedFieldsFromESQL } = useMemo(() => {
    // need to store the timing of the first request so we can atomically clear the cache per query
    const fn = memoize(
      (
        ...args: [
          {
            esqlQuery: string;
            search: any;
            timeRange: TimeRange;
            signal?: AbortSignal;
            dropNullColumns?: boolean;
            variables?: ESQLControlVariable[];
          }
        ]
      ) => ({
        timestamp: Date.now(),
        result: getEsqlColumns(...args),
      }),
      ({ esqlQuery }) => esqlQuery
    );

    return { cache: fn.cache, memoizedFieldsFromESQL: fn };
  }, []);

  const { cache: dataSourcesCache, memoizedSources } = useMemo(() => {
    const fn = memoize(
      (...args: [CoreStart, (() => Promise<ILicense | undefined>) | undefined]) => ({
        timestamp: Date.now(),
        result: getESQLSources(...args),
      })
    );

    return { cache: fn.cache, memoizedSources: fn };
  }, []);

  const { cache: historyStarredItemsCache, memoizedHistoryStarredItems } = useMemo(() => {
    const fn = memoize(
      (...args: [typeof getHistoryItems, typeof favoritesClient]) => ({
        timestamp: Date.now(),
        result: (async () => {
          const [getHistoryItemsFn, favoritesClientInstance] = args;
          const historyItems = getHistoryItemsFn('desc');
          // exclude error queries from history items as
          // we don't want to suggest them
          const historyStarredItems = historyItems
            .filter((item) => item.status !== 'error')
            .map((item) => item.queryString);

          try {
            const { favoriteMetadata } = (await favoritesClientInstance?.getFavorites()) || {};

            if (favoriteMetadata) {
              Object.keys(favoriteMetadata).forEach((id) => {
                const item = favoriteMetadata[id];
                const { queryString } = item;
                historyStarredItems.push(queryString);
              });
            }
          } catch {
            // do nothing
          }

          return historyStarredItems;
        })(),
      }),
      () => 'historyStarredItems'
    );

    return { cache: fn.cache, memoizedHistoryStarredItems: fn };
  }, []);

  const canCreateLookupIndex = useCanCreateLookupIndex();

  // Extract source command and build minimal query with cluster prefixes
  const minimalQuery = useMemo(() => {
    const prefix = code.match(/\b(FROM|TS)\b/i)?.[1]?.toUpperCase();
    const indexPattern = getIndexPatternFromESQLQuery(code);

    return prefix && indexPattern ? `${prefix} ${indexPattern}` : '';
  }, [code]);

  const minimalQueryRef = useRef(minimalQuery);
  minimalQueryRef.current = minimalQuery;

  const getJoinIndicesCallback = useCallback<Required<ESQLCallbacks>['getJoinIndices']>(
    async (cacheOptions) => {
      const result = await getJoinIndices(minimalQueryRef.current, core.http, cacheOptions);
      return result;
    },
    [core.http]
  );

  const telemetryCallbacks = useMemo<ESQLTelemetryCallbacks>(
    () => ({
      onDecorationHoverShown: (hoverMessage: string) =>
        telemetryService.trackLookupJoinHoverActionShown(hoverMessage),
      onSuggestionsWithCustomCommandShown: (commands) =>
        telemetryService.trackSuggestionsWithCustomCommandShown(commands),
      onSuggestionsReady,
    }),
    [onSuggestionsReady, telemetryService]
  );

  const onClickQueryHistory = useCallback(
    (isOpen: boolean) => {
      telemetryService.trackQueryHistoryOpened(isOpen);
      setIsHistoryOpen(isOpen);
    },
    [telemetryService, setIsHistoryOpen]
  );

  const esqlCallbacks = useMemo<ESQLCallbacks>(() => {
    const callbacks: ESQLCallbacks = {
      getSources: async () => {
        clearCacheWhenOld(dataSourcesCache, minimalQueryRef.current);
        const getLicense = kibana.services?.esql?.getLicense;
        const sources = await memoizedSources(core, getLicense).result;
        return sources;
      },
      getColumnsFor: async ({ query: queryToExecute }: { query?: string } | undefined = {}) => {
        if (queryToExecute) {
          // Check if there's a stale entry and clear it
          clearCacheWhenOld(esqlFieldsCache, `${queryToExecute} | limit 0`);
          const timeRange = data.query.timefilter.timefilter.getTime();
          return (
            (await memoizedFieldsFromESQL({
              esqlQuery: queryToExecute,
              search: data.search.search,
              timeRange,
              signal: abortController.signal,
              variables: variablesService?.esqlVariables,
              dropNullColumns: true,
            }).result) || []
          );
        }
        return [];
      },
      getPolicies: async () => getEsqlPolicies(core.http),
      getPreferences: async () => {
        return {
          histogramBarTarget,
        };
      },
      // @ts-expect-error To prevent circular type import, type defined here is partial of full client
      getFieldsMetadata: fieldsMetadata?.getClient(),
      getVariables: () => {
        return variablesService?.esqlVariables;
      },
      canSuggestVariables: () => {
        return variablesService?.isCreateControlSuggestionEnabled ?? false;
      },
      getJoinIndices: getJoinIndicesCallback,
      getTimeseriesIndices: async () => {
        return (await getTimeseriesIndices(core.http)) || [];
      },
      getEditorExtensions: async (queryString: string) => {
        // Only fetch recommendations if there's an active solutionId and a non-empty query
        // Otherwise the route will return an error
        if (activeSolutionId && queryString.trim() !== '') {
          return await getEditorExtensions(core.http, queryString, activeSolutionId);
        }
        return {
          recommendedQueries: [],
          recommendedFields: [],
        };
      },
      getInferenceEndpoints: async (taskType: InferenceTaskType) => {
        return (await getInferenceEndpoints(core.http, taskType)) || [];
      },
      getLicense: async () => {
        const ls = await kibana.services?.esql?.getLicense();

        if (!ls) {
          return undefined;
        }

        return {
          ...ls,
          hasAtLeast: ls.hasAtLeast.bind(ls),
        };
      },
      getActiveProduct: () => core.pricing.getActiveProduct(),
      getHistoryStarredItems: async () => {
        clearCacheWhenOld(historyStarredItemsCache, 'historyStarredItems');
        return await memoizedHistoryStarredItems(getHistoryItems, favoritesClient).result;
      },
      canCreateLookupIndex,
      isServerless: Boolean(kibana.services?.esql?.isServerless),
    };
    return callbacks;
  }, [
    fieldsMetadata,
    getJoinIndicesCallback,
    kibana.services?.esql,
    canCreateLookupIndex,
    dataSourcesCache,
    memoizedSources,
    core,
    esqlFieldsCache,
    data.query.timefilter.timefilter,
    data.search.search,
    memoizedFieldsFromESQL,
    abortController.signal,
    variablesService?.esqlVariables,
    variablesService?.isCreateControlSuggestionEnabled,
    histogramBarTarget,
    activeSolutionId,
    historyStarredItemsCache,
    memoizedHistoryStarredItems,
    favoritesClient,
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

  const parseMessages = useCallback(
    async (options?: { invalidateColumnsCache?: boolean }) => {
      if (editorModel.current) {
        return await ESQLLang.validate(editorModel.current, code, esqlCallbacks, options);
      }
      return {
        errors: [],
        warnings: [],
      };
    },
    [esqlCallbacks, code]
  );

  useEffect(() => {
    const setQueryToTheCache = async () => {
      if (editorRef?.current) {
        try {
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
        } catch (error) {
          // Default to warning when parseMessages fails
          addQueriesToCache({
            queryString: code,
            status: 'warning',
          });
        }
      }
    };
    if (isQueryLoading || isLoading) {
      setQueryToTheCache();
    }
  }, [isLoading, isQueryLoading, parseMessages, code]);

  const queryValidation = useCallback(
    async ({
      active,
      invalidateColumnsCache,
    }: {
      active: boolean;
      invalidateColumnsCache?: boolean;
    }) => {
      if (!editorModel.current || editorModel.current.isDisposed()) return;
      monaco.editor.setModelMarkers(editorModel.current, 'Unified search', []);
      const { warnings: parserWarnings, errors: parserErrors } = await parseMessages({
        invalidateColumnsCache,
      });

      let allErrors = parserErrors;
      let allWarnings = parserWarnings;

      // Only merge external messages if the flag is enabled
      if (mergeExternalMessages) {
        const externalErrorsParsedErrors = serverErrors ? parseErrors(serverErrors, code) : [];
        const externalErrorsParsedWarnings = serverWarning ? parseWarning(serverWarning) : [];

        allErrors = [...parserErrors, ...externalErrorsParsedErrors];
        allWarnings = [...parserWarnings, ...externalErrorsParsedWarnings];
      }

      const unerlinedWarnings = allWarnings.filter((warning) => warning.underlinedWarning);
      const nonOverlappingWarnings = filterOutWarningsOverlappingWithErrors(
        allErrors,
        unerlinedWarnings
      );

      const underlinedMessages = [...allErrors, ...nonOverlappingWarnings];
      const markers = [];

      if (dataErrorsControl?.enabled === false) {
        markers.push(...filterDataErrors(underlinedMessages));
      } else {
        markers.push(...underlinedMessages);
      }

      trackValidationLatencyEnd(active);

      if (active) {
        setEditorMessages({ errors: allErrors, warnings: allWarnings });
        monaco.editor.setModelMarkers(
          editorModel.current,
          'Unified search',
          // don't show the code in the editor
          // but we need it above
          markers.map((m) => ({ ...m, code: undefined }))
        );
        return;
      }
    },
    [
      parseMessages,
      serverErrors,
      code,
      serverWarning,
      dataErrorsControl?.enabled,
      mergeExternalMessages,
      trackValidationLatencyEnd,
    ]
  );

  const toggleVisor = useCallback(() => {
    setIsVisorOpen(!isVisorOpenRef.current);
  }, []);

  const onLookupIndexCreate = useCallback(
    async (resultQuery: string) => {
      // forces refresh
      dataSourcesCache?.clear?.();
      if (getJoinIndicesCallback) {
        await getJoinIndicesCallback({ forceRefresh: true });
      }
      onQueryUpdate(resultQuery);
      // Need to force validation, as the query might be unchanged,
      // but the lookup index was created
      await queryValidation({ active: true });
    },
    [dataSourcesCache, getJoinIndicesCallback, onQueryUpdate, queryValidation]
  );

  // Refresh the fields cache when a new field has been added to the lookup index
  const onNewFieldsAddedToLookupIndex = useCallback(async () => {
    esqlFieldsCache.clear?.();

    await queryValidation({ active: true, invalidateColumnsCache: true });
  }, [esqlFieldsCache, queryValidation]);

  const { lookupIndexBadgeStyle, addLookupIndicesDecorator } = useLookupIndexCommand(
    editorRef,
    editorModel,
    getJoinIndicesCallback,
    query,
    onLookupIndexCreate,
    onNewFieldsAddedToLookupIndex,
    onOpenQueryInNewTab
  );

  useDebounceWithOptions(
    async () => {
      if (!editorModel.current) return;
      const subscription = { active: true };
      trackValidationLatencyStart(code);

      if (code === codeWhenSubmitted && (serverErrors || serverWarning)) {
        resetValidationTracking();

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
    [serverErrors, serverWarning, code, queryValidation]
  );

  const suggestionProvider = useMemo(
    () => ESQLLang.getSuggestionProvider?.({ ...esqlCallbacks, telemetry: telemetryCallbacks }),
    [esqlCallbacks, telemetryCallbacks]
  );

  const hoverProvider = useMemo(
    () =>
      ESQLLang.getHoverProvider?.({
        ...esqlCallbacks,
        telemetry: telemetryCallbacks,
      }),
    [esqlCallbacks, telemetryCallbacks]
  );

  const signatureProvider = useMemo(() => {
    return ESQLLang.getSignatureProvider?.(esqlCallbacks);
  }, [esqlCallbacks]);

  const inlineCompletionsProvider = useMemo(() => {
    return ESQLLang.getInlineCompletionsProvider?.(esqlCallbacks);
  }, [esqlCallbacks]);

  const onErrorClick = useCallback(({ startLineNumber, startColumn }: MonacoMessage) => {
    if (!editorRef.current) {
      return;
    }

    editorRef.current.focus();
    editorRef.current.setPosition({
      lineNumber: startLineNumber,
      column: startColumn,
    });
    editorRef.current.revealLine(startLineNumber);
  }, []);

  // Clean up the monaco editor and DOM on unmount
  useEffect(() => {
    const disposablesMap = editorCommandDisposables.current;
    return () => {
      // Cleanup editor command disposables
      const currentEditor = editorRef.current;
      if (currentEditor) {
        const disposables = disposablesMap.get(currentEditor);
        if (disposables) {
          disposables.forEach((disposable) => {
            disposable.dispose();
          });
          disposablesMap.delete(currentEditor);
        }
      }

      resetPendingTracking();

      editorModel.current?.dispose();
      editorRef.current?.dispose();
      editorModel.current = undefined;
      editorRef.current = undefined;
    };
  }, [resetPendingTracking]);

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

  const codeEditorOptions: CodeEditorProps['options'] = useMemo(
    () => ({
      hover: {
        above: false,
      },
      parameterHints: {
        enabled: true,
        cycle: true,
      },
      accessibilitySupport: 'auto',
      autoIndent: 'keep',
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
      quickSuggestions: false,
      inlineSuggest: {
        enabled: true,
        showToolbar: 'onHover',
        suppressSuggestions: false,
        keepOnBlur: false,
      },
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
      tabSize: 2,
      theme: ESQL_LANG_ID,
      wordWrap: 'on',
      wrappingIndent: 'none',
    }),
    [isDisabled]
  );

  const htmlId = useGeneratedHtmlId({ prefix: 'esql-editor' });
  const [labelInFocus, setLabelInFocus] = useState(false);

  const editorPanel = (
    <>
      <Global styles={lookupIndexBadgeStyle} />
      {Boolean(editorIsInline) && (
        <EuiFlexGroup
          gutterSize="none"
          responsive={false}
          justifyContent="spaceBetween"
          alignItems={hideRunQueryButton ? 'flexEnd' : 'center'}
          css={css`
            padding: ${theme.euiTheme.size.s} 0;
          `}
        >
          <EuiFlexItem grow={false}>
            {formLabel && (
              <EuiFormLabel
                isFocused={labelInFocus && !isDisabled}
                isDisabled={isDisabled}
                aria-invalid={Boolean(editorMessages.errors.length)}
                isInvalid={Boolean(editorMessages.errors.length)}
                onClick={() => {
                  // HTML `for` doesn't correctly transfer click behavior to the code editor hint, so apply it manually
                  const editorElement = document.getElementById(htmlId);
                  if (editorElement) {
                    editorElement.click();
                  }
                }}
                htmlFor={htmlId}
              >
                {formLabel}
              </EuiFormLabel>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {!hideRunQueryButton && (
              <EuiToolTip
                position="top"
                content={i18n.translate('esqlEditor.query.runQuery', {
                  defaultMessage: 'Run query',
                })}
              >
                <EuiButton
                  color={queryRunButtonProperties.color as EuiButtonColor}
                  onClick={() => onQuerySubmit(QuerySource.MANUAL)}
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
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiFlexGroup
        gutterSize="none"
        css={{
          zIndex: theme.euiTheme.levels.flyout,
          position: 'relative',
        }}
        responsive={false}
        ref={containerRef}
      >
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
                  htmlId={htmlId}
                  aria-label={formLabel}
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
                  signatureProvider={signatureProvider}
                  inlineCompletionsProvider={inlineCompletionsProvider}
                  onChange={onQueryUpdate}
                  onFocus={() => setLabelInFocus(true)}
                  onBlur={() => setLabelInFocus(false)}
                  editorDidMount={async (editor) => {
                    // Track editor init time once per mount
                    reportInitLatency();

                    editorRef.current = editor;
                    const model = editor.getModel();
                    if (model) {
                      editorModel.current = model;
                      await addLookupIndicesDecorator();
                    }

                    // Register custom commands
                    const commandDisposables = registerCustomCommands({
                      application,
                      uiActions,
                      telemetryService,
                      editorRef: editorRef as React.RefObject<monaco.editor.IStandaloneCodeEditor>,
                      getCurrentQuery: () =>
                        fixESQLQueryWithVariables(
                          editorRef.current?.getValue() || '',
                          esqlVariablesRef.current
                        ),
                      esqlVariables: esqlVariablesRef,
                      controlsContext: controlsContextRef,
                      openTimePickerPopover,
                    });

                    // Add editor key bindings
                    addEditorKeyBindings(editor, onQuerySubmit, toggleVisor, onPrettifyQuery);

                    // Store disposables for cleanup
                    const currentEditor = editorRef.current;
                    if (currentEditor) {
                      if (!editorCommandDisposables.current.has(currentEditor)) {
                        editorCommandDisposables.current.set(currentEditor, commandDisposables);
                      }
                    }

                    // Add Tab keybinding rules for inline suggestions
                    addTabKeybindingRules();

                    editor.onMouseDown(() => {
                      if (datePickerOpenStatusRef.current) {
                        setPopoverPosition({});
                      }
                    });

                    editor.onDidFocusEditorText(() => {
                      // Skip triggering suggestions on initial focus to avoid interfering
                      // with editor initialization and automated tests
                      // Also skip when date picker is open to prevent overlap
                      if (!isFirstFocusRef.current && !datePickerOpenStatusRef.current) {
                        triggerSuggestions();
                      }

                      isFirstFocusRef.current = false;
                    });

                    // on CMD/CTRL + / comment out the entire line
                    editor.addCommand(
                      // eslint-disable-next-line no-bitwise
                      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash,
                      onCommentLine
                    );

                    setMeasuredEditorWidth(editor.getLayoutInfo().width);
                    if (expandToFitQueryOnMount) {
                      const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
                      const lineCount = editor.getModel()?.getLineCount() || 1;
                      const padding = lineHeight * 1.25; // Extra line at the bottom, plus a bit more to compensate for hidden vertical scrollbars
                      const height = editor.getTopForLineNumber(lineCount + 1) + padding;
                      if (height > editorHeight && height < EDITOR_MAX_HEIGHT) {
                        setEditorHeight(height);
                      } else if (height >= EDITOR_MAX_HEIGHT) {
                        setEditorHeight(EDITOR_MAX_HEIGHT);
                      }
                    }
                    editor.onDidLayoutChange((layoutInfoEvent) => {
                      onLayoutChangeRef.current(layoutInfoEvent);
                    });

                    editor.onDidChangeModelContent(async () => {
                      trackInputLatencyOnKeystroke(editor.getValue() ?? '');
                      await addLookupIndicesDecorator();
                      maybeTriggerSuggestions();
                    });

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
      {!hideQuickSearch && (
        <QuickSearchVisor
          query={code}
          isSpaceReduced={Boolean(editorIsInline) || measuredEditorWidth < BREAKPOINT_WIDTH}
          isVisible={isVisorOpen}
          onUpdateAndSubmitQuery={(newQuery) =>
            onUpdateAndSubmitQuery(newQuery, QuerySource.QUICK_SEARCH)
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
        onUpdateAndSubmitQuery={onUpdateAndSubmitQuery}
        onPrettifyQuery={onPrettifyQuery}
        detectedTimestamp={detectedTimestamp}
        hideRunQueryText={hideRunQueryText}
        editorIsInline={editorIsInline}
        isSpaceReduced={isSpaceReduced}
        hideTimeFilterInfo={hideTimeFilterInfo}
        {...editorMessages}
        isHistoryOpen={isHistoryOpen}
        setIsHistoryOpen={onClickQueryHistory}
        isLanguageComponentOpen={isLanguageComponentOpen}
        setIsLanguageComponentOpen={setIsLanguageComponentOpen}
        measuredContainerWidth={measuredEditorWidth}
        hideQueryHistory={hideQueryHistory}
        resizableContainerButton={resizableContainerButton}
        resizableContainerHeight={resizableContainerHeight}
        displayDocumentationAsFlyout={displayDocumentationAsFlyout}
        dataErrorsControl={dataErrorsControl}
        toggleVisor={() => setIsVisorOpen(!isVisorOpen)}
        hideQuickSearch={hideQuickSearch}
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
              zIndex: 1001,
              border: theme.euiTheme.border.thin,
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
                  const currentCursorPosition = editorRef.current?.getPosition();
                  const lineContent = editorModel.current?.getLineContent(
                    currentCursorPosition?.lineNumber ?? 0
                  );
                  const contentAfterCursor = lineContent?.substring(
                    (currentCursorPosition?.column ?? 0) - 1,
                    lineContent.length + 1
                  );

                  const dateString = `"${date.toISOString()}"`;
                  const addition = `${dateString}${contentAfterCursor}`;

                  editorRef.current?.executeEdits('time', [
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
                  editorRef.current?.setPosition({
                    lineNumber: currentCursorPosition?.lineNumber ?? 0,
                    column: (currentCursorPosition?.column ?? 0) + dateString.length,
                  });
                  // restore focus to the editor
                  editorRef.current?.focus();
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
};

export const ESQLEditor = withRestorableState(ESQLEditorInternal);
export type ESQLEditorProps = ComponentProps<typeof ESQLEditor>;
