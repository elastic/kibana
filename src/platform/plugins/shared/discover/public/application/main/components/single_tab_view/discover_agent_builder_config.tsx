/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo } from 'react';
import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import {
  isOfAggregateQueryType,
  type AggregateQuery,
  type Query,
  type TimeRange,
} from '@kbn/es-query';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import { AttachmentType, type AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import {
  internalStateActions,
  useAppStateSelector,
  useCurrentDataView,
  useCurrentTabAction,
  useCurrentTabDataStateContainer,
  useCurrentTabSelector,
  useInternalStateDispatch,
} from '../../state_management/redux';
import { useDataState } from '../../hooks/use_data_state';
import { FetchStatus } from '../../../types';
import {
  DISCOVER_DATA_ANALYST_AGENT_ID,
  ESQL_QUERY_RESULTS_ATTACHMENT_TYPE,
} from '../../../../../common/agent_builder';

const DISCOVER_CHAT_SESSION_TAG = 'discover';

const MAX_SAMPLE_ROWS = 15;
const MAX_COLUMNS = 30;
const MAX_VALUE_LENGTH = 100;

const updateQueryToolSchema = z.object({
  query: z.string().min(1).describe('The query string to apply to the current Discover tab.'),
  language: z
    .enum(['kuery', 'lucene'])
    .optional()
    .describe('For non-ES|QL tabs, the query language to use if it should change.'),
});

const openInNewTabToolSchema = z.object({
  esqlQuery: z.string().describe('The ES|QL query string to open in a new Discover tab'),
});

const getQueryText = (query: AggregateQuery | Query | undefined): string => {
  if (!query) return '';
  if (isOfAggregateQueryType(query)) return query.esql;
  return String(query.query);
};

const getQueryLanguage = (query: AggregateQuery | Query | undefined): string => {
  if (!query) return 'kuery';
  if (isOfAggregateQueryType(query)) return 'esql';
  return query.language;
};

const buildDiscoverQuery = ({
  currentQuery,
  nextLanguage,
  nextQuery,
}: {
  currentQuery: AggregateQuery | Query | undefined;
  nextLanguage?: 'kuery' | 'lucene';
  nextQuery: string;
}): AggregateQuery | Query => {
  if (isOfAggregateQueryType(currentQuery)) {
    return { esql: nextQuery };
  }
  return {
    language: nextLanguage ?? currentQuery?.language ?? 'kuery',
    query: nextQuery,
  };
};

const buildScreenContextAttachment = ({
  columns,
  dataSourceType,
  dataViewTitle,
  query,
  timeRange,
  url,
}: {
  columns: string[] | undefined;
  dataSourceType: string | undefined;
  dataViewTitle: string;
  query: AggregateQuery | Query | undefined;
  timeRange: TimeRange | undefined;
  url: string;
}): AttachmentInput => ({
  hidden: true,
  type: AttachmentType.screenContext,
  data: {
    app: 'discover',
    url,
    description: i18n.translate('discover.agentBuilder.screenContextDescription', {
      defaultMessage:
        'The user is viewing a Discover tab for data view {dataViewTitle} in {queryLanguage} mode.',
      values: {
        dataViewTitle,
        queryLanguage: getQueryLanguage(query),
      },
    }),
    time_range: timeRange ? { from: timeRange.from, to: timeRange.to } : undefined,
    additional_data: {
      columns: JSON.stringify(columns ?? []),
      data_source_type: dataSourceType ?? 'unknown',
      data_view: dataViewTitle,
      query: getQueryText(query),
      query_language: getQueryLanguage(query),
    },
  },
});

const buildEsqlResultsAttachment = ({
  query,
  esqlQueryColumns,
  result,
  totalHits,
  timeRange,
}: {
  query: AggregateQuery | Query | undefined;
  esqlQueryColumns: Array<{ name: string; meta?: { type?: string } }>;
  result: Array<{ flattened: Record<string, unknown> }>;
  totalHits: number;
  timeRange: TimeRange | undefined;
}): AttachmentInput => {
  const esqlQuery = isOfAggregateQueryType(query) ? query.esql : '';

  const columns = esqlQueryColumns.slice(0, MAX_COLUMNS).map((col) => ({
    name: col.name,
    type: col.meta?.type ?? 'unknown',
  }));

  const sampleRows = result.slice(0, MAX_SAMPLE_ROWS).map((row) => {
    const rowData: Record<string, unknown> = {};
    for (const col of columns) {
      const value = row.flattened[col.name];
      if (value !== undefined) {
        if (typeof value === 'string' && value.length > MAX_VALUE_LENGTH) {
          rowData[col.name] = value.substring(0, MAX_VALUE_LENGTH) + '...';
        } else {
          rowData[col.name] = value;
        }
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
      totalHits: totalHits || result.length,
      timeRange: timeRange ? { from: timeRange.from, to: timeRange.to } : undefined,
    },
  };
};

export const DiscoverAgentBuilderConfig = () => {
  const { agentBuilder } = useDiscoverServices();
  const dispatch = useInternalStateDispatch();
  const dataView = useCurrentDataView();
  const updateAppState = useCurrentTabAction(internalStateActions.updateAppState);
  const [columns, dataSource, query, sort] = useAppStateSelector((state) => [
    state.columns,
    state.dataSource,
    state.query,
    state.sort,
  ]);
  const timeRange = useCurrentTabSelector((tab) => tab.globalState.timeRange);

  const dataStateContainer = useCurrentTabDataStateContainer();
  const documentState = useDataState(dataStateContainer.data$.documents$);

  const isEsqlMode = isOfAggregateQueryType(query);
  const hasEsqlResults =
    isEsqlMode &&
    documentState.fetchStatus === FetchStatus.COMPLETE &&
    documentState.result &&
    documentState.result.length > 0 &&
    documentState.esqlQueryColumns;

  const updateQueryTool: BrowserApiToolDefinition<z.infer<typeof updateQueryToolSchema>> = useMemo(
    () => ({
      id: 'discover_update_query',
      description: i18n.translate('discover.agentBuilder.updateQueryToolDescription', {
        defaultMessage:
          'Update the current Discover tab query and trigger a refresh. Use ES|QL when the current tab is in esql mode, otherwise use KQL or Lucene.',
      }),
      schema: updateQueryToolSchema,
      handler: async ({ language, query: nextQuery }: z.infer<typeof updateQueryToolSchema>) => {
        dispatch(
          updateAppState({
            appState: {
              query: buildDiscoverQuery({
                currentQuery: query,
                nextLanguage: language,
                nextQuery,
              }),
            },
          })
        );
      },
    }),
    [dispatch, query, updateAppState]
  );

  const openInNewTabTool: BrowserApiToolDefinition<z.infer<typeof openInNewTabToolSchema>> =
    useMemo(
      () => ({
        id: 'discover_open_esql_query_in_new_tab',
        description: 'Open query in Discover',
        schema: openInNewTabToolSchema,
        handler: async ({ esqlQuery }: z.infer<typeof openInNewTabToolSchema>) => {
          dispatch(
            internalStateActions.openInNewTab({
              appState: { query: { esql: esqlQuery } },
            })
          );
        },
      }),
      [dispatch]
    );

  const browserApiTools = useMemo(
    () => (isEsqlMode ? [updateQueryTool, openInNewTabTool] : [updateQueryTool]),
    [isEsqlMode, openInNewTabTool, updateQueryTool]
  );

  useEffect(() => {
    if (!agentBuilder) {
      return;
    }
    return () => {
      agentBuilder.clearChatConfig();
    };
  }, [agentBuilder]);

  useEffect(() => {
    if (!agentBuilder) {
      return;
    }

    const attachments: AttachmentInput[] = [
      buildScreenContextAttachment({
        columns,
        dataSourceType: dataSource?.type,
        dataViewTitle: dataView.getIndexPattern(),
        query,
        timeRange,
        url: window.location.href,
      }),
    ];

    if (hasEsqlResults) {
      attachments.push(
        buildEsqlResultsAttachment({
          query,
          esqlQueryColumns: documentState.esqlQueryColumns!,
          result: documentState.result!,
          totalHits: documentState.result!.length,
          timeRange,
        })
      );
    }

    agentBuilder.setChatConfig({
      sessionTag: DISCOVER_CHAT_SESSION_TAG,
      agentId: isEsqlMode ? DISCOVER_DATA_ANALYST_AGENT_ID : undefined,
      attachments,
      browserApiTools,
    });
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
    sort,
    timeRange,
  ]);

  return null;
};
