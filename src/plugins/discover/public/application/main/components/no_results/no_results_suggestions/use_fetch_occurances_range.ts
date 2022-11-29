/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { lastValueFrom } from 'rxjs';
import type { DataView } from '@kbn/data-plugin/common';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { buildEsQuery } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/common';

export interface Params {
  dataView?: DataView;
  query?: Query | AggregateQuery;
  filters?: Filter[];
  services: {
    data: DataPublicPluginStart;
    uiSettings: IUiSettingsClient;
  };
}

export interface State {
  from?: string | null;
  to?: string | null;
}

export const useFetchOccurrencesRange = (params: Params): State => {
  const data = params.services.data;
  const uiSettings = params.services.uiSettings;
  const [state, setState] = useState<State>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef<boolean>(true);

  const searchOccurrence = useCallback(
    async (
      sortOrder: 'asc' | 'desc',
      dataView: DataView,
      query?: Query | AggregateQuery,
      filters?: Filter[]
    ): Promise<string | null> => {
      if (!dataView?.timeFieldName || !mountedRef.current) {
        return null;
      }
      const result = await lastValueFrom(
        data.search.search(
          {
            params: {
              index: dataView.title,
              body: {
                query: buildEsQuery(
                  dataView,
                  query ?? [],
                  filters ?? [],
                  getEsQueryConfig(uiSettings)
                ),
                fields: [
                  {
                    field: dataView.timeFieldName,
                    format: 'strict_date_optional_time',
                  },
                ],
                size: 1,
                sort: { [dataView.timeFieldName]: sortOrder },
                _source: false,
              },
            },
          },
          {
            abortSignal: abortControllerRef.current?.signal,
          }
        )
      );
      return result.rawResponse?.hits?.hits[0]?.fields?.[dataView.timeFieldName]?.[0] ?? null;
    },
    [data, uiSettings, abortControllerRef]
  );

  const fetchOccurrences = useCallback(
    async (dataView?: DataView, query?: Query | AggregateQuery, filters?: Filter[]) => {
      if (!dataView?.timeFieldName || !query) {
        return;
      }

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      try {
        const [firstOccurredAt, lastOccurredAt] = await Promise.all([
          searchOccurrence('asc', dataView, query, filters),
          searchOccurrence('desc', dataView, query, filters),
        ]);

        if (mountedRef.current) {
          setState({
            from: firstOccurredAt,
            to: lastOccurredAt,
          });
        }
      } catch (error) {
        if (mountedRef.current) {
          setState({});
        }
      }
    },
    [abortControllerRef, searchOccurrence, setState, mountedRef]
  );

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, [abortControllerRef, mountedRef]);

  useEffect(() => {
    fetchOccurrences(params.dataView, params.query, params.filters);
  }, [fetchOccurrences, params.query, params.filters, params.dataView]);

  return state;
};
