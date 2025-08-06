/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect, useRef } from 'react';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { useIsEsqlMode } from '../application/main/hooks/use_is_esql_mode';
import { useDiscoverServices } from './use_discover_services';

const POLL_INTERVAL = 10000; // every 10 seconds

interface UseNewEntriesWatcherProps {
  lastLoadedTimestamp: number;
  query?: object;
  dataView: DataView;
  timeField: string;
  timefilter: TimefilterContract;
}

export function useNewEntriesWatcher({
  lastLoadedTimestamp,
  query,
  dataView,
  timeField,
  timefilter,
}: UseNewEntriesWatcherProps) {
  const [count, setCount] = useState(0);
  const interval = useRef<NodeJS.Timeout>();
  const services = useDiscoverServices();
  const { data } = services;
  const isEsqlMode = useIsEsqlMode();

  useEffect(() => {
    if (!timefilter.getTime().to.endsWith('now') || lastLoadedTimestamp === 0 || isEsqlMode) return;

    async function checkForUpdates() {
      // Query for latest timestamp
      const searchBody = {
        size: 0,
        query,
        aggs: { max_ts: { max: { field: timeField } } },
      };
      const response = await data.search
        .search({
          params: {
            index: dataView.getIndexPattern(),
            body: searchBody,
          },
        })
        .toPromise();

      const maxTsAgg = response?.rawResponse?.aggregations?.max_ts as
        | { value?: number; value_as_string?: string }
        | undefined;
      const maxTs = maxTsAgg?.value ?? 0;
      if (maxTs > lastLoadedTimestamp) {
        // Optionally count new docs
        const countResp = await data.search
          .search({
            params: {
              index: dataView.getIndexPattern(),
              body: {
                query: {
                  bool: {
                    must: [
                      query,
                      { range: { [timeField]: { gt: lastLoadedTimestamp, lte: maxTs } } },
                    ],
                  },
                },
                track_total_hits: true,
                size: 0,
              },
            },
          })
          .toPromise();
        // Fix: Check if hits.total is a number or object
        const totalHits = countResp?.rawResponse.hits.total;
        const totalHitsValue = typeof totalHits === 'number' ? totalHits : totalHits?.value ?? 0;
        setCount(totalHitsValue);
      } else {
        setCount(0);
      }
    }

    interval.current = setInterval(checkForUpdates, POLL_INTERVAL);
    return () => clearInterval(interval.current!);
  }, [lastLoadedTimestamp, query, dataView, timeField, timefilter, data.search, isEsqlMode]);

  // Optionally reset
  function reset() {
    setCount(0);
  }

  return { count, reset };
}
