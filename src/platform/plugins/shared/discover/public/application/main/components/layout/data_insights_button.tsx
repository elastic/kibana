/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { z } from '@kbn/zod/v4';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { i18n } from '@kbn/i18n';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import {
  internalStateActions,
  useAppStateSelector,
  useCurrentTabDataStateContainer,
  useInternalStateDispatch,
} from '../../state_management/redux';
import { useDataState } from '../../hooks/use_data_state';
import { FetchStatus } from '../../../types';
import { useFetchMoreRecords } from './use_fetch_more_records';
import { ESQL_QUERY_RESULTS_ATTACHMENT_TYPE } from '../../../../../common/agent_builder';

const MAX_SAMPLE_ROWS = 15;
const MAX_COLUMNS = 30;
const MAX_VALUE_LENGTH = 100;

const openEsqlQuerySchema = z.object({
  esqlQuery: z.string().describe('The ES|QL query string to open in a new Discover tab'),
});

export const DataInsightsButton = () => {
  const { agentBuilder, timefilter } = useDiscoverServices();
  const dispatch = useInternalStateDispatch();
  const query = useAppStateSelector((state) => state.query);
  const dataStateContainer = useCurrentTabDataStateContainer();
  const documentState = useDataState(dataStateContainer.data$.documents$);
  const { totalHits } = useFetchMoreRecords();

  const isEsqlQuery = isOfAggregateQueryType(query);
  const hasResults =
    documentState.fetchStatus === FetchStatus.COMPLETE &&
    documentState.result &&
    documentState.result.length > 0;

  const attachmentData = useMemo(() => {
    if (!isEsqlQuery || !hasResults || !documentState.result || !documentState.esqlQueryColumns) {
      return null;
    }

    const esqlQuery = 'esql' in query! ? query.esql : '';

    const columns = documentState.esqlQueryColumns.slice(0, MAX_COLUMNS).map((col) => ({
      name: col.name,
      type: col.meta?.type ?? 'unknown',
    }));

    const sampleRows = documentState.result.slice(0, MAX_SAMPLE_ROWS).map((row) => {
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

    const time = timefilter.getTime();
    const timeRange = {
      from: time.from,
      to: time.to,
    };

    return {
      query: esqlQuery,
      columns,
      sampleRows,
      totalHits: totalHits ?? documentState.result.length,
      timeRange,
    };
  }, [
    isEsqlQuery,
    hasResults,
    query,
    documentState.result,
    documentState.esqlQueryColumns,
    totalHits,
    timefilter,
  ]);

  const openInDiscoverTabTool = useMemo<
    BrowserApiToolDefinition<z.infer<typeof openEsqlQuerySchema>>
  >(
    () => ({
      id: 'discover_open_esql_query_in_new_tab',
      description:
        'Opens an ES|QL query in a new Discover tab within Kibana. Call this when the user asks to open or run a suggested query in Discover.',
      schema: openEsqlQuerySchema,
      handler: async ({ esqlQuery }: { esqlQuery: string }) => {
        dispatch(
          internalStateActions.openInNewTab({
            appState: { query: { esql: esqlQuery } },
          })
        );
      },
    }),
    [dispatch]
  );

  const handleClick = useCallback(() => {
    if (!agentBuilder?.openChat || !attachmentData) {
      return;
    }

    const attachment: AttachmentInput = {
      id: `esql-results-${Date.now()}`,
      type: ESQL_QUERY_RESULTS_ATTACHMENT_TYPE,
      data: attachmentData,
    };

    agentBuilder.openChat({
      newConversation: true,
      autoSendInitialMessage: true,
      initialMessage: i18n.translate('discover.dataInsights.initialMessage', {
        defaultMessage: 'Analyze my ES|QL query results and suggest follow-up queries',
      }),
      attachments: [attachment],
      sessionTag: 'discover-insights',
      browserApiTools: [openInDiscoverTabTool],
    });
  }, [agentBuilder, attachmentData, openInDiscoverTabTool]);

  if (!agentBuilder?.openChat || !isEsqlQuery || !hasResults || !attachmentData) {
    return null;
  }

  return (
    <AiButton
      size="xs"
      variant="empty"
      onClick={handleClick}
      data-test-subj="discoverDataInsightsButton"
    >
      {i18n.translate('discover.dataInsights.buttonLabel', {
        defaultMessage: 'Summarize with AI',
      })}
    </AiButton>
  );
};
