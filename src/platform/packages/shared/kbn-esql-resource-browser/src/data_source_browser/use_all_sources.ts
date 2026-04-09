/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useState } from 'react';
import type {
  ESQLSourceResult,
  IndexAutocompleteItem,
  IndicesAutocompleteResult,
} from '@kbn/esql-types';

const normalizeTimeseriesIndices = ({
  indices,
}: Pick<IndicesAutocompleteResult, 'indices'>): ESQLSourceResult[] => {
  return (
    indices?.map((index) => ({
      name: index.name,
      type: 'timeseries',
      title: index.name,
      hidden: false,
    })) ?? []
  );
};

export interface UseAllSourcesParams {
  isOpen: boolean;
  preloadedSources?: ESQLSourceResult[];
  isTimeseries: boolean;
  getSources: () => Promise<ESQLSourceResult[]>;
  getTimeseriesIndices: () => Promise<{ indices: IndexAutocompleteItem[] }>;
}

export const useAllSources = ({
  isOpen,
  preloadedSources,
  isTimeseries,
  getSources,
  getTimeseriesIndices,
}: UseAllSourcesParams): { allSources: ESQLSourceResult[]; isLoading: boolean } => {
  const [allSources, setAllSources] = useState<ESQLSourceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let isEffectActive = true;

    if (preloadedSources !== undefined) {
      setAllSources(preloadedSources);
      return;
    }

    const fetchSources = async () => {
      setIsLoading(true);
      try {
        if (isTimeseries) {
          const result = (await getTimeseriesIndices?.()) ?? { indices: [] };
          const normalized = normalizeTimeseriesIndices(result);
          if (isMountedRef.current && isEffectActive) setAllSources(normalized);
        } else {
          const fetched = (await getSources?.()) ?? [];
          if (isMountedRef.current && isEffectActive) setAllSources(fetched);
        }
      } catch {
        if (isMountedRef.current && isEffectActive) setAllSources([]);
      } finally {
        if (isMountedRef.current && isEffectActive) setIsLoading(false);
      }
    };

    fetchSources();

    return () => {
      isEffectActive = false;
    };
  }, [getSources, getTimeseriesIndices, isTimeseries, isOpen, preloadedSources]);

  return { allSources, isLoading };
};
