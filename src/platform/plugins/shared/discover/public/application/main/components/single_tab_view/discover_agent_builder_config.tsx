/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import { isOfAggregateQueryType, type AggregateQuery, type Query } from '@kbn/es-query';
import type { ActiveConversation } from '@kbn/agent-builder-browser';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import { AttachmentType, type AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import {
  internalStateActions,
  useAppStateSelector,
  useCurrentDataView,
  useCurrentTabDataStateContainer,
  useCurrentTabSelector,
  useInternalStateDispatch,
} from '../../state_management/redux';
import { useDataState } from '../../hooks/use_data_state';
import { FetchStatus } from '../../../types';
import { useFetchMoreRecords } from '../layout/use_fetch_more_records';
import { ESQL_QUERY_RESULTS_ATTACHMENT_TYPE } from '../../../../../common/agent_builder';

const SESSION_TAG = 'discover';
const MAX_SAMPLE_ROWS = 10;
const MAX_COLUMNS = 100;
const MAX_VALUE_LENGTH = 100;

const ESQL_INITIAL_MESSAGE = i18n.translate('discover.agentBuilder.esqlInitialMessage', {
  defaultMessage: 'Analyze my data',
});

const updateQuerySchema = z.object({
  query: z.string().min(1).describe('The query string to apply to the current Discover tab.'),
  language: z
    .enum(['kuery', 'lucene'])
    .optional()
    .describe('For non-ES|QL tabs, the query language to use if it should change.'),
});

export const toDiscoverQuery = (
  currentQuery: AggregateQuery | Query | undefined,
  nextQuery: string,
  nextLanguage?: 'kuery' | 'lucene'
): AggregateQuery | Query => {
  if (isOfAggregateQueryType(currentQuery)) {
    return { esql: nextQuery };
  }
  return {
    language: nextLanguage ?? currentQuery?.language ?? 'kuery',
    query: nextQuery,
  };
};

const getQueryLanguage = (query: AggregateQuery | Query | undefined): string => {
  if (!query) return 'kuery';
  if (isOfAggregateQueryType(query)) return 'esql';
  return query.language;
};

const getQueryText = (query: AggregateQuery | Query | undefined): string => {
  if (!query) return '';
  if (isOfAggregateQueryType(query)) return query.esql;
  return String(query.query);
};

export const buildScreenContext = (
  dataViewTitle: string,
  query: AggregateQuery | Query | undefined,
  columns: string[] | undefined,
  dataSourceType: string | undefined,
  timeRange: { from: string; to: string } | undefined
): AttachmentInput => ({
  hidden: true,
  type: AttachmentType.screenContext,
  data: {
    app: SESSION_TAG,
    url: window.location.href,
    description: i18n.translate('discover.agentBuilder.screenContextDescription', {
      defaultMessage:
        'The user is viewing a Discover tab for data view {dataViewTitle} in {queryLanguage} mode.',
      values: { dataViewTitle, queryLanguage: getQueryLanguage(query) },
    }),
    time_range: timeRange,
    additional_data: {
      columns: JSON.stringify(columns ?? []),
      data_source_type: dataSourceType ?? 'unknown',
      data_view: dataViewTitle,
      query: getQueryText(query),
      query_language: getQueryLanguage(query),
    },
  },
});

export const shouldPrefillEsqlPrompt = (
  isEsqlMode: boolean,
  activeConversation: ActiveConversation | null | undefined,
  hasPrefilled: boolean
): boolean => {
  if (!isEsqlMode || hasPrefilled) return false;
  // Pre-first-emission: don't prefill — the sidebar might already be open with an
  // existing conversation we shouldn't disrupt.
  if (activeConversation === undefined) return false;
  // Keep the prefill in config while sidebar is closed (null) or open without a
  // conversation id yet. Dropping it during that window would wipe `initialMessage`
  // before `use_initial_message` auto-sends.
  return !activeConversation?.id;
};

export const buildEsqlResultsAttachment = (
  esqlQuery: string,
  esqlQueryColumns: Array<{ name: string; meta?: { type?: string } }>,
  result: Array<{ flattened: Record<string, unknown> }>,
  totalHits: number,
  timeRange: { from: string; to: string } | undefined
): AttachmentInput => {
  // Build a set of base field names to detect .keyword duplicates
  const columnNames = new Set(esqlQueryColumns.map((col) => col.name));

  // Filter out .keyword columns when the base field also exists (e.g. skip "host.keyword" if "host" exists)
  // no need to send columns with the same content twice
  const filteredColumns = esqlQueryColumns.filter((col) => {
    if (col.name.endsWith('.keyword')) {
      const baseName = col.name.slice(0, -'.keyword'.length);
      return !columnNames.has(baseName);
    }
    return true;
  });

  const columns = filteredColumns.slice(0, MAX_COLUMNS).map((col) => ({
    name: col.name,
    type: col.meta?.type ?? 'unknown',
  }));

  const sampleRows = result.slice(0, MAX_SAMPLE_ROWS).map((row) => {
    const rowData: Record<string, unknown> = {};
    for (const col of columns) {
      const value = row.flattened[col.name];
      if (value !== undefined) {
        rowData[col.name] =
          typeof value === 'string' && value.length > MAX_VALUE_LENGTH
            ? value.substring(0, MAX_VALUE_LENGTH) + '...'
            : value;
      }
    }
    return rowData;
  });

  return {
    id: 'esql-query-results',
    type: ESQL_QUERY_RESULTS_ATTACHMENT_TYPE,
    data: {
      query: esqlQuery,
      columns,
      sampleRows,
      totalHits,
      timeRange,
    },
  };
};

export const DiscoverAgentBuilderConfig = () => {
  const { agentBuilder } = useDiscoverServices();
  const dispatch = useInternalStateDispatch();
  const dataView = useCurrentDataView();
  const [columns, dataSource, query] = useAppStateSelector((state) => [
    state.columns,
    state.dataSource,
    state.query,
  ]);
  const timeRange = useCurrentTabSelector((tab) => tab.globalState.timeRange);

  const dataStateContainer = useCurrentTabDataStateContainer();
  const documentState = useDataState(dataStateContainer.data$.documents$);
  const { totalHits } = useFetchMoreRecords();

  const isEsqlMode = isOfAggregateQueryType(query);
  const hasEsqlResults =
    isEsqlMode &&
    documentState.fetchStatus === FetchStatus.COMPLETE &&
    documentState.result &&
    documentState.result.length > 0 &&
    Boolean(documentState.esqlQueryColumns);

  // Use a ref for query so the tool handler always reads the latest value
  const queryRef = useRef(query);
  queryRef.current = query;

  // Tracks the agent-builder sidebar state. `undefined` means we haven't received
  // the BehaviorSubject's first emission yet — we must not prefill because
  // we don't know whether the sidebar is already open.
  const [activeConversation, setActiveConversation] = useState<
    ActiveConversation | null | undefined
  >(undefined);

  const hasPrefilledEsqlPromptRef = useRef(false);

  useEffect(() => {
    if (!agentBuilder) return;
    const sub = agentBuilder.events.ui.activeConversation$.subscribe(setActiveConversation);
    return () => sub.unsubscribe();
  }, [agentBuilder]);

  const runQueryTool: BrowserApiToolDefinition<z.infer<typeof updateQuerySchema>> = useMemo(
    () => ({
      id: 'discover_run_query',
      description: i18n.translate('discover.agentBuilder.runQueryToolDescription', {
        defaultMessage: 'Run a query in a new Discover tab.',
      }),
      schema: updateQuerySchema,
      handler: async ({ language, query: nextQuery }: z.infer<typeof updateQuerySchema>) => {
        const newQuery = toDiscoverQuery(queryRef.current, nextQuery, language);
        dispatch(internalStateActions.openInNewTab({ appState: { query: newQuery } }));
      },
    }),
    [dispatch]
  );

  const browserApiTools = useMemo(
    () => (isEsqlMode ? [runQueryTool] : []),
    [isEsqlMode, runQueryTool]
  );

  const prefillEsqlPrompt = shouldPrefillEsqlPrompt(
    isEsqlMode,
    activeConversation,
    hasPrefilledEsqlPromptRef.current
  );

  useEffect(() => {
    if (!agentBuilder) {
      return;
    }

    const normalizedTimeRange = timeRange ? { from: timeRange.from, to: timeRange.to } : undefined;

    const attachments: AttachmentInput[] = [
      buildScreenContext(
        dataView.getIndexPattern(),
        query,
        columns,
        dataSource?.type,
        normalizedTimeRange
      ),
    ];

    if (hasEsqlResults && documentState.esqlQueryColumns && documentState.result) {
      const esqlQuery = isOfAggregateQueryType(query) ? query.esql : '';
      attachments.push(
        buildEsqlResultsAttachment(
          esqlQuery,
          documentState.esqlQueryColumns,
          documentState.result,
          totalHits ?? documentState.result.length,
          normalizedTimeRange
        )
      );
    }

    agentBuilder.setChatConfig({
      sessionTag: SESSION_TAG,
      attachments,
      browserApiTools,
      ...(prefillEsqlPrompt
        ? {
            newConversation: true,
            initialMessage: ESQL_INITIAL_MESSAGE,
            autoSendInitialMessage: true,
          }
        : {}),
    });

    return () => {
      agentBuilder.clearChatConfig();
    };
  }, [
    agentBuilder,
    browserApiTools,
    columns,
    dataSource?.type,
    dataView,
    documentState.esqlQueryColumns,
    documentState.result,
    hasEsqlResults,
    isEsqlMode,
    query,
    prefillEsqlPrompt,
    timeRange,
    totalHits,
  ]);

  // Mark the prompt as prefilled once a real conversation id exists.
  useEffect(() => {
    if (isEsqlMode && activeConversation?.id) {
      hasPrefilledEsqlPromptRef.current = true;
    }
  }, [isEsqlMode, activeConversation]);

  return null;
};
