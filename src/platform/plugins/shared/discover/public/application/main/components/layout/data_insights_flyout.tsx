/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiMarkdownFormat,
  EuiText,
  EuiIcon,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DATA_INSIGHTS_ROUTE } from '@kbn/esql-types';
import { isOfAggregateQueryType, getAggregateQueryMode } from '@kbn/es-query';
import { dismissAllFlyoutsExceptFor, DiscoverFlyouts } from '@kbn/discover-utils';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import {
  internalStateActions,
  useCurrentTabDataStateContainer,
  useAppStateSelector,
  useInternalStateDispatch,
} from '../../state_management/redux';
import { useDataState } from '../../hooks/use_data_state';

interface DataInsightsFlyoutProps {
  onClose: () => void;
}

// Module-level cache keyed by query text
interface CachedInsight {
  content: string;
  suggestedQueries: string[];
}
const insightsCache = new Map<string, CachedInsight>();

const getQueryText = (query: unknown): string => {
  if (query && typeof query === 'object' && isOfAggregateQueryType(query)) {
    const mode = getAggregateQueryMode(query);
    return (query as Record<string, string>)[mode] ?? '';
  }
  return '';
};

const truncateValue = (value: unknown): unknown => {
  if (typeof value === 'string' && value.length > 100) {
    return value.slice(0, 100) + '...';
  }
  return value;
};

const EsqlQueryBlock: React.FC<{
  query: string;
  onRunInNewTab: (esqlQuery: string) => void;
}> = ({ query, onRunInNewTab }) => (
  <div>
    <EuiMarkdownFormat textSize="relative">{`\`\`\`esql\n${query.trim()}\n\`\`\``}</EuiMarkdownFormat>
    <EuiSpacer size="xs" />
    <EuiButtonEmpty
      size="xs"
      iconType="plusInCircle"
      onClick={() => onRunInNewTab(query.trim())}
      data-test-subj="dataInsightsRunQueryButton"
    >
      {i18n.translate('discover.dataInsights.runInNewTab', {
        defaultMessage: 'Run in new tab',
      })}
    </EuiButtonEmpty>
    <EuiSpacer size="s" />
  </div>
);

export const DataInsightsFlyout: React.FC<DataInsightsFlyoutProps> = ({ onClose }) => {
  const services = useDiscoverServices();
  const { http } = services;
  const dispatch = useInternalStateDispatch();

  const [content, setContent] = useState('');
  const [suggestedQueries, setSuggestedQueries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const query = useAppStateSelector((state) => state.query);
  const dataStateContainer = useCurrentTabDataStateContainer();
  const documentsState = useDataState(dataStateContainer.data$.documents$);
  const totalHitsState = useDataState(dataStateContainer.data$.totalHits$);

  const queryText = useMemo(() => getQueryText(query), [query]);

  const columns = useMemo(
    () =>
      (documentsState.esqlQueryColumns ?? []).slice(0, 30).map((col) => ({
        name: col.name,
        type: col.meta?.type ?? 'unknown',
      })),
    [documentsState.esqlQueryColumns]
  );

  const sampleRows = useMemo(() => {
    const rows = documentsState.result ?? [];
    return rows.slice(0, 15).map((record) => {
      const truncated: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(record.flattened)) {
        truncated[key] = truncateValue(value);
      }
      return truncated;
    });
  }, [documentsState.result]);

  const totalHits = totalHitsState.result ?? 0;

  const fetchInsights = useCallback(
    async (skipCache = false) => {
      if (!queryText) return;

      if (!skipCache) {
        const cached = insightsCache.get(queryText);
        if (cached) {
          setContent(cached.content);
          setSuggestedQueries(cached.suggestedQueries);
          return;
        }
      }

      setIsLoading(true);
      setError(null);
      setContent('');
      setSuggestedQueries([]);

      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const response = await window.fetch(http.basePath.prepend(DATA_INSIGHTS_ROUTE), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'kbn-xsrf': 'true',
            'x-elastic-internal-origin': 'Kibana',
          },
          body: JSON.stringify({ query: queryText, columns, sampleRows, totalHits }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorBody = await response.json();
          throw new Error(errorBody.message ?? `Request failed with status ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response stream available');
        }

        const decoder = new TextDecoder();
        let accumulated = '';
        let currentEvent = '';
        const queries: string[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (currentEvent === 'chatCompletionChunk' && parsed.content) {
                  accumulated += parsed.content;
                  setContent(accumulated);
                } else if (currentEvent === 'suggestedQuery' && parsed.query) {
                  queries.push(parsed.query);
                  setSuggestedQueries([...queries]);
                }
              } catch {
                // skip malformed SSE data
              }
              currentEvent = '';
            }
          }
        }

        insightsCache.set(queryText, { content: accumulated, suggestedQueries: queries });
      } catch (err) {
        if (abortController.signal.aborted) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [queryText, columns, sampleRows, totalHits, http]
  );

  useEffect(() => {
    dismissAllFlyoutsExceptFor(DiscoverFlyouts.dataInsights);
    fetchInsights();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchInsights]);

  const onRegenerate = useCallback(() => {
    fetchInsights(true);
  }, [fetchInsights]);

  const onRunInNewTab = useCallback(
    (esqlQuery: string) => {
      dispatch(
        internalStateActions.openInNewTabExtPointAction({
          query: { esql: esqlQuery },
          tabLabel: 'AI Query',
        })
      );
    },
    [dispatch]
  );

  return (
    <EuiFlyout
      type="push"
      size="s"
      onClose={onClose}
      data-test-subj="dataInsightsFlyout"
      aria-labelledby="dataInsightsFlyoutTitle"
      pushMinBreakpoint="xl"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="dataInsightsFlyoutTitle">
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="sparkles" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem>
                {i18n.translate('discover.dataInsights.flyoutTitle', {
                  defaultMessage: 'AI Data Insights',
                })}
              </EuiFlexItem>
            </EuiFlexGroup>
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {error && (
          <EuiCallOut
            announceOnMount
            title={i18n.translate('discover.dataInsights.errorTitle', {
              defaultMessage: 'Unable to generate insights',
            })}
            color="danger"
            iconType="error"
          >
            <p>{error}</p>
          </EuiCallOut>
        )}

        {!error && !content && isLoading && (
          <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}

        {content && (
          <EuiMarkdownFormat data-test-subj="dataInsightsContent">{content}</EuiMarkdownFormat>
        )}

        {suggestedQueries.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('discover.dataInsights.suggestedQueriesTitle', {
                  defaultMessage: 'Suggested Queries',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            {suggestedQueries.map((esqlQuery, idx) => (
              <EsqlQueryBlock key={idx} query={esqlQuery} onRunInNewTab={onRunInNewTab} />
            ))}
          </>
        )}

        {content && suggestedQueries.length === 0 && isLoading && (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.translate('discover.dataInsights.generatingQueries', {
                  defaultMessage: 'Generating suggested queries...',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('discover.dataInsights.disclaimer', {
                defaultMessage: 'AI-generated content may be inaccurate.',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="refresh"
              onClick={onRegenerate}
              disabled={isLoading}
              data-test-subj="dataInsightsRegenerateButton"
            >
              {i18n.translate('discover.dataInsights.regenerate', {
                defaultMessage: 'Regenerate',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
