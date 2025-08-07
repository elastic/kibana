/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { BoolQuery } from '@kbn/es-query';
import { useDiscoverServices } from './use_discover_services';
import { usePageVisibility } from './use_page_visibility';

const POLL_INTERVAL = 10000; // every 10 seconds
const POLL_TIMEOUT = 2000; // 5 seconds max per polling request
const MAX_CONSECUTIVE_FAILURES = 3; // Disable polling after this many failures

interface UseNewEntriesWatcherProps {
  lastLoadedTimestamp: number;
  query?: { bool: BoolQuery };
  dataView: DataView;
  timeField: string;
  timefilter: TimefilterContract;
  isEsqlMode?: boolean;
  esqlQuery?: string;
}

interface EsqlResponse {
  values?: Array<Array<string | number | boolean | null>>;
  columns?: Array<{ name: string; type: string }>;
}

function shouldSkipEsqlPolling(esqlQuery: string): boolean {
  const expensivePatterns = [
    /\bJOIN\b/i, // Joins are expensive
    /\bSTATS\b.*\bBY\b/i, // Stats with grouping
    /\bENRICH\b/i, // Enrichment operations
    /\bEVAL\b.*\bCASE\b/i, // Complex eval expressions
    /\bDISSOLVE\b/i, // Dissolve operations
  ];

  return expensivePatterns.some((pattern) => pattern.test(esqlQuery));
}

export function useNewEntriesWatcher({
  lastLoadedTimestamp,
  query,
  dataView,
  timeField,
  timefilter,
  isEsqlMode = false,
  esqlQuery,
}: UseNewEntriesWatcherProps) {
  const [count, setCount] = useState(0);
  const [pollingDisabled, setPollingDisabled] = useState(false);
  const [lastKnownTotal, setLastKnownTotal] = useState(0);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const interval = useRef<NodeJS.Timeout>();
  const services = useDiscoverServices();
  const { data } = services;
  const isPageVisible = usePageVisibility();

  // ES|QL query execution function
  const executeEsqlQuery = useCallback(
    async (esqlQueryString: string, abortSignal: AbortSignal) => {
      return await data.search
        .search(
          {
            params: {
              query: esqlQueryString,
            },
            abortSignal,
          },
          {
            strategy: 'esql',
          }
        )
        .toPromise();
    },
    [data.search]
  );

  // KQL/Lucene polling logic
  const checkForUpdatesKql = useCallback(
    async (abortSignal: AbortSignal) => {
      const searchBody = {
        size: 0,
        query: {
          bool: {
            must: [query, { range: { [timeField]: { gt: lastLoadedTimestamp } } }],
          },
        },
        aggs: {
          max_ts: { max: { field: timeField } },
          new_docs_count: {
            filter: {
              range: { [timeField]: { gt: lastLoadedTimestamp } },
            },
          },
        },
        track_total_hits: true,
      };

      const response = await data.search
        .search({
          params: {
            index: dataView.getIndexPattern(),
            body: searchBody,
          },
          abortSignal,
        })
        .toPromise();

      const maxTsAgg = response?.rawResponse?.aggregations?.max_ts as
        | { value?: number }
        | undefined;
      const newDocsAgg = response?.rawResponse?.aggregations?.new_docs_count as
        | { doc_count?: number }
        | undefined;

      const maxTs = maxTsAgg?.value ?? 0;
      const newDocsCount = newDocsAgg?.doc_count ?? 0;

      if (maxTs > lastLoadedTimestamp) {
        setCount(newDocsCount);
      } else {
        setCount(0);
      }
    },
    [data.search, dataView, query, timeField, lastLoadedTimestamp]
  );

  // ES|QL polling logic
  const checkForUpdatesEsql = useCallback(
    async (abortSignal: AbortSignal) => {
      if (!esqlQuery) return;

      // Extract FROM clause to get the index
      const fromMatch = esqlQuery.match(/FROM\s+([^\s|]+)/i);
      // Cannot extract index from ES|QL query
      if (!fromMatch) return;

      const indexName = fromMatch[1];

      // Simple approach: Get total count and compare with last known
      const countQuery = `FROM ${indexName} | STATS total_count = COUNT(*)`;

      const countResponse = await executeEsqlQuery(countQuery, abortSignal);

      // Parse ES|QL response - it returns values array (rows/columns)
      const rawValue = (countResponse?.rawResponse as EsqlResponse)?.values?.[0]?.[0];
      const currentTotal = typeof rawValue === 'number' ? rawValue : 0;

      // Compare with last known total
      if (lastKnownTotal === 0) {
        // First time - just store the current total
        setLastKnownTotal(currentTotal);
        setCount(0);
      } else if (currentTotal > lastKnownTotal) {
        const newCount = currentTotal - lastKnownTotal;
        setCount(newCount);
        setLastKnownTotal(currentTotal);
      } else {
        setCount(0);
      }
    },
    [esqlQuery, executeEsqlQuery, lastKnownTotal]
  );

  useEffect(() => {
    // Don't poll if disabled due to timeouts/errors
    if (pollingDisabled) return;

    const refreshInterval = timefilter.getRefreshInterval();
    const isAutoRefreshOn =
      refreshInterval && refreshInterval.pause === false && refreshInterval.value > 0;
    // We don't want to poll if auto-refresh is enabled
    if (isAutoRefreshOn) return;

    // Don't poll for complex ES|QL queries
    if (isEsqlMode && esqlQuery && shouldSkipEsqlPolling(esqlQuery)) return;

    // Don't poll if time filter is not set to 'now' or if lastLoadedTimestamp is 0
    if (!timefilter.getTime().to.endsWith('now') || lastLoadedTimestamp === 0) return;

    // Use Kibana's built-in page visibility detection
    // Kibana's auto-refresh already pauses when page is not visible
    // We can check document.hidden directly (same logic as auto_refresh_loop.ts)
    if (document.hidden) return;

    // Use page visibility hook
    if (!isPageVisible) return;

    async function checkForUpdates() {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), POLL_TIMEOUT);

      try {
        if (isEsqlMode) {
          await checkForUpdatesEsql(abortController.signal);
        } else {
          await checkForUpdatesKql(abortController.signal);
        }

        setConsecutiveFailures(0);
      } catch (error) {
        if (error.name === 'AbortError') {
          // 'Polling request timed out'
        }
        setConsecutiveFailures((prev) => prev + 1);

        // Disable polling after 3 consecutive failures
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          setPollingDisabled(true);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    interval.current = setInterval(checkForUpdates, POLL_INTERVAL);
    return () => clearInterval(interval.current!);
  }, [
    lastLoadedTimestamp,
    query,
    dataView,
    timeField,
    timefilter,
    data.search,
    isEsqlMode,
    pollingDisabled,
    esqlQuery,
    checkForUpdatesEsql,
    checkForUpdatesKql,
    consecutiveFailures,
    isPageVisible,
  ]);

  // Reset function
  function reset() {
    setCount(0);
    // Also reset polling disabled state to allow retry
    if (pollingDisabled) {
      setPollingDisabled(false);
      setConsecutiveFailures(0);
    }
  }

  return { count, reset, pollingDisabled };
}
