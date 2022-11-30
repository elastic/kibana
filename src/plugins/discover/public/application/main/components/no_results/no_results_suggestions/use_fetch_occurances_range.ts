/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataView } from '@kbn/data-plugin/common';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { buildEsQuery } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { getDocumentsTimeRange } from '@kbn/unified-search-plugin/public';

export interface Params {
  dataView?: DataView;
  query?: Query | AggregateQuery;
  filters?: Filter[];
  services: {
    data: DataPublicPluginStart;
    uiSettings: IUiSettingsClient;
  };
}

export interface OccurrencesRange {
  from: string;
  to: string;
}

export const useFetchOccurrencesRange = (
  params: Params
): { range: OccurrencesRange | null; refetch: () => Promise<OccurrencesRange | null> } => {
  const data = params.services.data;
  const uiSettings = params.services.uiSettings;
  const [state, setState] = useState<OccurrencesRange | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef<boolean>(true);

  const fetchOccurrences = useCallback(
    async (dataView?: DataView, query?: Query | AggregateQuery, filters?: Filter[]) => {
      let occurrencesRange = null;
      if (!dataView?.timeFieldName || !query) {
        return null;
      }

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      try {
        const dslQuery = buildEsQuery(
          dataView,
          query ?? [],
          filters ?? [],
          getEsQueryConfig(uiSettings)
        );
        occurrencesRange = await getDocumentsTimeRange({
          data,
          dataView,
          dslQuery,
          abortSignal: abortControllerRef.current?.signal,
        });
      } catch (error) {
        //
      }

      if (mountedRef.current) {
        setState(occurrencesRange);
      }

      return occurrencesRange;
    },
    [abortControllerRef, setState, mountedRef, data, uiSettings]
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

  return {
    range: state,
    refetch: () => fetchOccurrences(params.dataView, params.query, params.filters),
  };
};
