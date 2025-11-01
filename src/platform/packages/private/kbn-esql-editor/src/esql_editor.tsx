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
  EuiProgress,
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
import { getESQLQueryColumns } from '@kbn/esql-utils';
import type { CodeEditorProps } from '@kbn/code-editor';
import { CodeEditor } from '@kbn/code-editor';
import type { CoreStart } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import type { FieldType } from '@kbn/esql-ast';
import type { ESQLFieldWithMetadata } from '@kbn/esql-ast/src/commands_registry/types';
import type { ESQLTelemetryCallbacks } from '@kbn/esql-types';
import {
  ESQLVariableType,
  type ESQLControlVariable,
  type IndicesAutocompleteResult,
} from '@kbn/esql-types';
import { fixESQLQueryWithVariables, getRemoteClustersFromESQLQuery } from '@kbn/esql-utils';
import { FavoritesClient } from '@kbn/content-management-favorites-public';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { SerializedEnrichPolicy } from '@kbn/index-management-shared-types';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ILicense } from '@kbn/licensing-types';
import { ESQLLang, ESQL_LANG_ID, monaco, type ESQLCallbacks } from '@kbn/monaco';
import type { MonacoMessage } from '@kbn/monaco/src/languages/esql/language';
import type { ComponentProps } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useObservable from 'react-use/lib/useObservable';
import {
  hasLimitBeforeAggregate,
  missingSortBeforeLimit,
} from '@kbn/esql-utils/src/utils/query_parsing_helpers';
import type { TelemetryQuerySubmittedProps } from '@kbn/esql-types/src/esql_telemetry_types';
import { QuerySource } from '@kbn/esql-types/src/esql_telemetry_types';
import { useCanCreateLookupIndex, useLookupIndexCommand } from './custom_commands';
import { EditorFooter } from './editor_footer';
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
  getESQLSources,
  getEditorOverwrites,
  onKeyDownResizeHandler,
  onMouseDownResizeHandler,
  parseErrors,
  parseWarning,
  useDebounceWithOptions,
} from './helpers';
import { addQueriesToCache } from './history_local_storage';
import { ResizableButton } from './resizable_button';
import { useRestorableState, withRestorableState } from './restorable_state';
import { getHistoryItems } from './history_local_storage';
import type { StarredQueryMetadata } from './editor_footer/esql_starred_queries_service';
import type {
  ControlsContext,
  ESQLEditorDeps,
  ESQLEditorProps as ESQLEditorPropsInternal,
} from './types';

// for editor width smaller than this value we want to start hiding some text
const BREAKPOINT_WIDTH = 540;
const DATEPICKER_WIDTH = 373;

const triggerControl = async (
  queryString: string,
  variableType: ESQLVariableType,
  position: monaco.Position | null | undefined,
  uiActions: ESQLEditorDeps['uiActions'],
  esqlVariables?: ESQLControlVariable[],
  onSaveControl?: ControlsContext['onSaveControl'],
  onCancelControl?: ControlsContext['onCancelControl']
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
  expandToFitQueryOnMount,
  dataErrorsControl,
  formLabel,
  mergeExternalMessages,
}: ESQLEditorPropsInternal) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const editorModel = useRef<monaco.editor.ITextModel>();
  const editor1 = useRef<monaco.editor.IStandaloneCodeEditor>();
  const containerRef = useRef<HTMLElement>(null);

  const datePickerOpenStatusRef = useRef<boolean>(false);
  const theme = useEuiTheme();
  const kibana = useKibana<ESQLEditorDeps>();
  const {
    dataViews,
    application,
    core,
    fieldsMetadata,
    uiSettings,
    uiActions,
    data,
    usageCollection,
  } = kibana.services;

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

  // Add CSS styles for the glyph icons
  const searchGlyphStyles = css`
    .esql-search-glyph {
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      position: relative;
    }

    .esql-search-glyph:hover {
      border-radius: 2px;
      background-color: ${theme.euiTheme.colors.lightShade};
    }

    .esql-search-glyph::before {
      content: '';
      width: 14px;
      height: 14px;
      background-image: url('data:image/png;base64,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');
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      display: block;
      filter: grayscale(1) opacity(0.7);
    }

    .esql-search-glyph:hover::before {
      filter: grayscale(0) opacity(1);
    }
  `;
  const searchBadgeClassName = 'resourcesBadge';

  const searchBadgeStyle = css`
    .${searchBadgeClassName} {
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
      padding-block: 2px;
      padding-inline: 6px 8px;
      max-inline-size: 100%;
      font-size: 0.8571rem;
      line-height: 18px;
      font-weight: 500;
      white-space: nowrap;
      text-decoration: none;
      border-radius: 6px;
      text-align: start;
      border: 1px solid ${theme.euiTheme.colors.borderBasePlain};
      background-color: ${theme.euiTheme.colors.emptyShade};
      color: ${theme.euiTheme.colors.text} !important;
      position: relative;
    }

    .${searchBadgeClassName}::before {
      content: '';
      width: 12px;
      height: 12px;
      background-image: url('https://icons.veryicon.com/png/o/education-technology/education-app/search-137.png');
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      margin-right: 4px;
      display: inline-block;
      flex-shrink: 0;
      filter: grayscale(1) opacity(0.7);
    }

    .${searchBadgeClassName}:hover {
      border-color: ${theme.euiTheme.colors.primary};
      background-color: ${theme.euiTheme.colors.lightestShade};
    }

    .${searchBadgeClassName}:hover::before {
      filter: grayscale(0) opacity(1);
    }
  `;

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
  const [isLLMLoading, setIsLLMLoading] = useState(false);
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

  const onQuerySubmit = useCallback(
    (source: TelemetryQuerySubmittedProps['query_source']) => {
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

        // TODO: add rest of options
        if (currentValue) {
          telemetryService.trackQuerySubmitted({
            query_source: source,
            query_length: editor1.current?.getModel()?.getValueLength().toString() ?? '0',
            query_lines: editor1.current?.getModel()?.getLineCount().toString() ?? '0',
            anti_limit_before_aggregate: hasLimitBeforeAggregate(currentValue),
            anti_missing_sort_before_limit: missingSortBeforeLimit(currentValue),
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
      if (code !== fixedQuery) {
        setCode(fixedQuery);
      }
    }
  }, [code, fixedQuery]);

  // Enable the variables service if the feature is supported in the consumer app
  useEffect(() => {
    if (controlsContext?.supportsControls) {
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
  }, [variablesService, controlsContext, esqlVariables]);

  const showSuggestionsIfEmptyQuery = useCallback(() => {
    if (editorModel.current?.getValueLength() === 0) {
      setTimeout(() => {
        editor1.current?.trigger(undefined, 'editor.action.triggerSuggest', {});
      }, 0);
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
      const absoluteTop = editorTop + (editorPosition?.top ?? 0) + 25;
      let absoluteLeft = editorLeft + (editorPosition?.left ?? 0);
      if (absoluteLeft > editorCoords.width) {
        // date picker is out of the editor
        absoluteLeft = absoluteLeft - DATEPICKER_WIDTH;
      }

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

  const controlCommands = [
    { command: 'esql.control.multi_values.create', variableType: ESQLVariableType.MULTI_VALUES },
    { command: 'esql.control.time_literal.create', variableType: ESQLVariableType.TIME_LITERAL },
    { command: 'esql.control.fields.create', variableType: ESQLVariableType.FIELDS },
    { command: 'esql.control.values.create', variableType: ESQLVariableType.VALUES },
    { command: 'esql.control.functions.create', variableType: ESQLVariableType.FUNCTIONS },
  ];

  controlCommands.forEach(({ command, variableType }) => {
    monaco.editor.registerCommand(command, async (...args) => {
      const position = editor1.current?.getPosition();
      await triggerControl(
        fixedQuery,
        variableType,
        position,
        uiActions,
        esqlVariables,
        controlsContext?.onSaveControl,
        controlsContext?.onCancelControl
      );
    });
  });

  editor1.current?.addCommand(
    // eslint-disable-next-line no-bitwise
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
    () => onQuerySubmit(QuerySource.MANUAL)
  );

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

  const onEditorFocus = useCallback(() => {
    setIsCodeEditorExpandedFocused(true);
    showSuggestionsIfEmptyQuery();
    setLabelInFocus(true);
  }, [showSuggestionsIfEmptyQuery]);

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
        result: getESQLQueryColumns(...args),
      }),
      ({ esqlQuery }) => esqlQuery
    );

    return { cache: fn.cache, memoizedFieldsFromESQL: fn };
  }, []);

  const { cache: dataSourcesCache, memoizedSources } = useMemo(() => {
    const fn = memoize(
      (
        ...args: [
          DataViewsPublicPluginStart,
          CoreStart,
          (() => Promise<ILicense | undefined>) | undefined
        ]
      ) => ({
        timestamp: Date.now(),
        result: getESQLSources(...args),
      })
    );

    return { cache: fn.cache, memoizedSources: fn };
  }, []);

  const canCreateLookupIndex = useCanCreateLookupIndex();

  const getJoinIndices = useCallback<Required<ESQLCallbacks>['getJoinIndices']>(
    async (cacheOptions) => {
      const remoteClusters = getRemoteClustersFromESQLQuery(code);
      let result: IndicesAutocompleteResult = { indices: [] };
      if (kibana.services?.esql?.getJoinIndicesAutocomplete) {
        result = await kibana.services.esql.getJoinIndicesAutocomplete.call(
          { forceRefresh: cacheOptions?.forceRefresh },
          remoteClusters?.join(',')
        );
      }
      return result;
    },
    [code, kibana?.services?.esql?.getJoinIndicesAutocomplete]
  );

  const telemetryCallbacks = useMemo<ESQLTelemetryCallbacks>(
    () => ({
      onDecorationHoverShown: (hoverMessage: string) =>
        telemetryService.trackLookupJoinHoverActionShown(hoverMessage),
      onSuggestionsWithCustomCommandShown: (commandIds: string[]) =>
        telemetryService.trackSuggestionsWithCustomCommandShown(commandIds),
    }),
    [telemetryService]
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
        clearCacheWhenOld(dataSourcesCache, fixedQuery);
        const getLicense = kibana.services?.esql?.getLicense;
        const sources = await memoizedSources(dataViews, core, getLicense).result;
        return sources;
      },
      getColumnsFor: async ({ query: queryToExecute }: { query?: string } | undefined = {}) => {
        if (queryToExecute) {
          // Check if there's a stale entry and clear it
          clearCacheWhenOld(esqlFieldsCache, `${queryToExecute} | limit 0`);
          const timeRange = data.query.timefilter.timefilter.getTime();
          try {
            const columns = await memoizedFieldsFromESQL({
              esqlQuery: queryToExecute,
              search: data.search.search,
              timeRange,
              signal: abortController.signal,
              variables: variablesService?.esqlVariables,
              dropNullColumns: true,
            }).result;
            const columnsWithMetadata: ESQLFieldWithMetadata[] =
              columns.map((c) => {
                return {
                  name: c.name,
                  type: c.meta.esType as FieldType,
                  hasConflict: c.meta.type === KBN_FIELD_TYPES.CONFLICT,
                  userDefined: false,
                };
              }) || [];

            return columnsWithMetadata;
          } catch (e) {
            // no action yet
          }
        }
        return [];
      },
      getPolicies: async () => {
        try {
          const policies = (await core.http.get(
            `/internal/index_management/enrich_policies`
          )) as SerializedEnrichPolicy[];

          return policies.map(({ type, query: policyQuery, ...rest }) => rest);
        } catch (error) {
          return [];
        }
      },
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
        return variablesService?.areSuggestionsEnabled ?? false;
      },
      getJoinIndices,
      getTimeseriesIndices: kibana.services?.esql?.getTimeseriesIndicesAutocomplete,
      getEditorExtensions: async (queryString: string) => {
        // Only fetch recommendations if there's an active solutionId and a non-empty query
        // Otherwise the route will return an error
        if (activeSolutionId && queryString.trim() !== '') {
          return (
            (await kibana.services?.esql?.getEditorExtensionsAutocomplete(
              queryString,
              activeSolutionId
            )) ?? { recommendedQueries: [], recommendedFields: [] }
          );
        }
        return {
          recommendedQueries: [],
          recommendedFields: [],
        };
      },
      getInferenceEndpoints: kibana.services?.esql?.getInferenceEndpointsAutocomplete,
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
        const historyItems = getHistoryItems('desc');
        const items = historyItems.map((item) => item.queryString);

        const { favoriteMetadata } = (await favoritesClient?.getFavorites()) || {};

        if (favoriteMetadata) {
          Object.keys(favoriteMetadata).forEach((id) => {
            const item = favoriteMetadata[id];
            const { queryString } = item;
            items.push(queryString);
          });
        }
        return items;
      },
      getESQLCompletionFromLLM: async (queryString: string) => {
        setIsLLMLoading(true);
        try {
          const message: { content: string } = await core.http.post(
            '/internal/esql/esql_completion',
            {
              body: JSON.stringify({ query: queryString }),
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
          return message.content;
        } catch (error) {
          return '';
        } finally {
          setIsLLMLoading(false);
        }
      },
      canCreateLookupIndex,
      isServerless: Boolean(kibana.services?.esql?.isServerless),
    };
    return callbacks;
  }, [
    fieldsMetadata,
    favoritesClient,
    kibana.services?.esql,
    dataSourcesCache,
    fixedQuery,
    memoizedSources,
    dataViews,
    core,
    esqlFieldsCache,
    data.query.timefilter.timefilter,
    data.search.search,
    memoizedFieldsFromESQL,
    abortController,
    variablesService?.esqlVariables,
    variablesService?.areSuggestionsEnabled,
    histogramBarTarget,
    activeSolutionId,
    canCreateLookupIndex,
    getJoinIndices,
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
    async ({ active }: { active: boolean }) => {
      if (!editorModel.current || editorModel.current.isDisposed()) return;
      monaco.editor.setModelMarkers(editorModel.current, 'Unified search', []);
      const { warnings: parserWarnings, errors: parserErrors } = await parseMessages();

      let allErrors = parserErrors;
      let allWarnings = parserWarnings;

      // Only merge external messages if the flag is enabled
      if (mergeExternalMessages) {
        const externalErrorsParsedErrors = serverErrors ? parseErrors(serverErrors, code) : [];
        const externalErrorsParsedWarnings = serverWarning ? parseWarning(serverWarning) : [];

        allErrors = [...parserErrors, ...externalErrorsParsedErrors];
        allWarnings = [...parserWarnings, ...externalErrorsParsedWarnings];
      }

      const markers = [];

      if (allErrors.length) {
        if (dataErrorsControl?.enabled === false) {
          markers.push(...filterDataErrors(allErrors));
        } else {
          markers.push(...allErrors);
        }
      }

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
    ]
  );

  const onLookupIndexCreate = useCallback(
    async (resultQuery: string) => {
      // forces refresh
      dataSourcesCache?.clear?.();
      if (getJoinIndices) {
        await getJoinIndices({ forceRefresh: true });
      }
      onQueryUpdate(resultQuery);
      // Need to force validation, as the query might be unchanged,
      // but the lookup index was created
      await queryValidation({ active: true });
    },
    [dataSourcesCache, getJoinIndices, onQueryUpdate, queryValidation]
  );

  // Refresh the fields cache when a new field has been added to the lookup index
  const onNewFieldsAddedToLookupIndex = useCallback(() => {
    esqlFieldsCache.clear?.();
  }, [esqlFieldsCache]);

  const { lookupIndexBadgeStyle, addLookupIndicesDecorator } = useLookupIndexCommand(
    editor1,
    editorModel,
    getJoinIndices,
    query,
    onLookupIndexCreate,
    onNewFieldsAddedToLookupIndex
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

  const inlineCompletionsProvider = useMemo(() => {
    return ESQLLang.getInlineCompletionsProvider?.(esqlCallbacks);
  }, [esqlCallbacks]);

  // Store reference to the provider for triggering LLM suggestions
  const inlineCompletionsProviderRef = useRef<
    (monaco.languages.InlineCompletionsProvider & { triggerLLMSuggestions: () => void }) | undefined
  >();

  useEffect(() => {
    inlineCompletionsProviderRef.current = inlineCompletionsProvider as
      | (monaco.languages.InlineCompletionsProvider & { triggerLLMSuggestions: () => void })
      | undefined;
  }, [inlineCompletionsProvider]);

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
      editorModel.current = undefined;
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

  const codeEditorOptions: CodeEditorProps['options'] = useMemo(
    () => ({
      hover: {
        above: false,
      },
      accessibilitySupport: 'auto',
      autoIndent: 'keep',
      automaticLayout: true,
      contextmenu: true,
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
      glyphMargin: true,
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
      <Global styles={[lookupIndexBadgeStyle, searchGlyphStyles, searchBadgeStyle]} />
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
      {isLLMLoading && <EuiProgress size="xs" color="accent" />}
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
              <div
                css={styles.editorContainer}
                onContextMenu={(e) => {
                  // Prevent browser's default context menu to ensure Monaco's context menu always appears
                  e.preventDefault();
                }}
              >
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
                  inlineCompletionsProvider={inlineCompletionsProvider}
                  onChange={onQueryUpdate}
                  onFocus={() => setLabelInFocus(true)}
                  onBlur={() => setLabelInFocus(false)}
                  editorDidMount={async (editor) => {
                    editor1.current = editor;
                    const model = editor.getModel();
                    if (model) {
                      editorModel.current = model;
                      await addLookupIndicesDecorator();
                    }

                    // this is fixing a bug between the EUIPopover and the monaco editor
                    // when the user clicks the editor, we force it to focus and the onDidFocusEditorText
                    // to fire, the timeout is needed because otherwise it refocuses on the popover icon
                    // and the user needs to click again the editor.
                    // IMPORTANT: The popover needs to be wrapped with the EuiOutsideClickDetector component.
                    editor.onMouseDown((e) => {
                      // Don't interfere with right-clicks (context menu) - let Monaco handle them
                      if (e.event.rightButton) {
                        // Ensure the browser's default context menu is prevented
                        e.event.preventDefault();
                        return;
                      }

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

                    // on CMD/CTRL + / comment out the entire line
                    editor.addCommand(
                      // eslint-disable-next-line no-bitwise
                      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash,
                      onCommentLine
                    );

                    // Add keyboard shortcut for inline suggestions
                    editor.addAction({
                      id: 'esql.triggerInlineSuggestions',
                      label: 'ES|QL: Get AI Suggestions',
                      keybindings: [
                        // eslint-disable-next-line no-bitwise
                        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI,
                      ],
                      contextMenuGroupId: 'navigation',
                      run: (editorInstance) => {
                        // Set the flag to indicate our custom action was triggered
                        inlineCompletionsProviderRef.current?.triggerLLMSuggestions();

                        try {
                          editorInstance.trigger(
                            'manual',
                            'editor.action.inlineSuggest.trigger',
                            {}
                          );
                        } catch (error) {
                          // nothing to do here
                        }
                      },
                    });

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
                      await addLookupIndicesDecorator();
                      showSuggestionsIfEmptyQuery();
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
        setIsHistoryOpen={onClickQueryHistory}
        isLanguageComponentOpen={isLanguageComponentOpen}
        setIsLanguageComponentOpen={setIsLanguageComponentOpen}
        measuredContainerWidth={measuredEditorWidth}
        hideQueryHistory={hideQueryHistory}
        resizableContainerButton={resizableContainerButton}
        resizableContainerHeight={resizableContainerHeight}
        displayDocumentationAsFlyout={displayDocumentationAsFlyout}
        dataErrorsControl={dataErrorsControl}
        telemetryService={telemetryService}
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
};

export const ESQLEditor = withRestorableState(ESQLEditorInternal);

export type ESQLEditorProps = ComponentProps<typeof ESQLEditor>;
