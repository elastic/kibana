/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import { AttachmentType, type AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { i18n } from '@kbn/i18n';
import {
  isOfAggregateQueryType,
  type AggregateQuery,
  type Query,
  type TimeRange,
} from '@kbn/es-query';
import { z } from '@kbn/zod/v4';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import {
  internalStateActions,
  useAppStateSelector,
  useCurrentDataView,
  useCurrentTabAction,
  useCurrentTabSelector,
  useInternalStateDispatch,
} from '../../state_management/redux';

const DISCOVER_CHAT_SESSION_TAG = 'discover';
const DISCOVER_UPDATE_QUERY_TOOL_ID = 'discover_update_query';

interface DiscoverUpdateQueryToolParams {
  language?: 'kuery' | 'lucene';
  query: string;
}

interface BuildDiscoverQueryParams {
  currentQuery: AggregateQuery | Query | undefined;
  nextLanguage?: 'kuery' | 'lucene';
  nextQuery: string;
}

interface BuildDiscoverScreenContextAttachmentParams {
  appFiltersCount: number;
  columns: string[] | undefined;
  dataSourceType: string | undefined;
  dataViewTitle: string;
  globalFiltersCount: number;
  query: AggregateQuery | Query | undefined;
  sort: string[][] | undefined;
  timeRange: TimeRange | undefined;
  url: string;
}

const toolSchema = z.object({
  query: z.string().min(1).describe('The query string to apply to the current Discover tab.'),
  language: z
    .enum(['kuery', 'lucene'])
    .optional()
    .describe('For non-ES|QL tabs, the query language to use if it should change.'),
});

const getDiscoverQueryText = (query: AggregateQuery | Query | undefined) => {
  if (!query) {
    return '';
  }

  if (isOfAggregateQueryType(query)) {
    return query.esql;
  }

  return query.query;
};

const getDiscoverQueryLanguage = (query: AggregateQuery | Query | undefined) => {
  if (!query) {
    return 'kuery';
  }

  if (isOfAggregateQueryType(query)) {
    return 'esql';
  }

  return query.language;
};

export const buildDiscoverQuery = ({
  currentQuery,
  nextLanguage,
  nextQuery,
}: BuildDiscoverQueryParams): AggregateQuery | Query => {
  if (isOfAggregateQueryType(currentQuery)) {
    return { esql: nextQuery };
  }

  return {
    language: nextLanguage ?? currentQuery?.language ?? 'kuery',
    query: nextQuery,
  };
};

export const buildDiscoverScreenContextAttachment = ({
  appFiltersCount,
  columns,
  dataSourceType,
  dataViewTitle,
  globalFiltersCount,
  query,
  sort,
  timeRange,
  url,
}: BuildDiscoverScreenContextAttachmentParams): AttachmentInput => ({
  hidden: true,
  type: AttachmentType.screenContext,
  data: {
    app: 'discover',
    url,
    description: i18n.translate('discover.agentBuilder.screenContextAttachmentDescription', {
      defaultMessage:
        'The user is viewing a Discover tab for data view {dataViewTitle} in {queryLanguage} mode.',
      values: {
        dataViewTitle,
        queryLanguage: getDiscoverQueryLanguage(query),
      },
    }),
    time_range: timeRange ? { from: timeRange.from, to: timeRange.to } : undefined,
    additional_data: {
      app_filters_count: String(appFiltersCount),
      columns: JSON.stringify(columns ?? []),
      data_source_type: dataSourceType ?? 'unknown',
      data_view: dataViewTitle,
      global_filters_count: String(globalFiltersCount),
      query: getDiscoverQueryText(query),
      query_language: getDiscoverQueryLanguage(query),
      sort: JSON.stringify(sort ?? []),
    },
  },
});

export const DiscoverAgentBuilderConfig = () => {
  const { agentBuilder } = useDiscoverServices();
  const dispatch = useInternalStateDispatch();
  const dataView = useCurrentDataView();
  const updateAppState = useCurrentTabAction(internalStateActions.updateAppState);
  const [columns, dataSource, filters, query, sort] = useAppStateSelector((state) => [
    state.columns,
    state.dataSource,
    state.filters,
    state.query,
    state.sort,
  ]);
  const globalFilters = useCurrentTabSelector((tab) => tab.globalState.filters);
  const timeRange = useCurrentTabSelector((tab) => tab.globalState.timeRange);

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

    const browserApiTools: Array<BrowserApiToolDefinition<DiscoverUpdateQueryToolParams>> = [
      {
        id: DISCOVER_UPDATE_QUERY_TOOL_ID,
        description: i18n.translate('discover.agentBuilder.updateQueryToolDescription', {
          defaultMessage:
            'Update the current Discover tab query and trigger a refresh. Use ES|QL when the current tab is in esql mode, otherwise use KQL or Lucene.',
        }),
        schema: toolSchema,
        handler: async ({ language, query: nextQuery }) => {
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
      },
    ];

    agentBuilder.setChatConfig({
      sessionTag: DISCOVER_CHAT_SESSION_TAG,
      attachments: [
        buildDiscoverScreenContextAttachment({
          appFiltersCount: filters?.length ?? 0,
          columns,
          dataSourceType: dataSource?.type,
          dataViewTitle: dataView.getIndexPattern(),
          globalFiltersCount: globalFilters?.length ?? 0,
          query,
          sort,
          timeRange,
          url: window.location.href,
        }),
      ],
      browserApiTools,
    });
  }, [
    agentBuilder,
    columns,
    dataSource?.type,
    dataView,
    dispatch,
    filters,
    globalFilters,
    query,
    sort,
    timeRange,
    updateAppState,
  ]);

  return null;
};
