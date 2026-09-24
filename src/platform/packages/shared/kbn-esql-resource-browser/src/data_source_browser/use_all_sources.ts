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
  EsqlDatasetsResult,
  IndexAutocompleteItem,
  IndicesAutocompleteResult,
} from '@kbn/esql-types';
import { SOURCES_TYPES } from '@kbn/esql-types';

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

const normalizeDatasets = ({ datasets }: EsqlDatasetsResult): ESQLSourceResult[] =>
  datasets?.map((d) => ({
    name: d.name,
    title: d.name,
    description: d.description,
    type: SOURCES_TYPES.EXTERNAL,
    hidden: false,
  })) ?? [];

const mergeSources = (
  base: ESQLSourceResult[],
  datasets: ESQLSourceResult[]
): ESQLSourceResult[] => {
  const seenNames = new Set(base.map((source) => source.name));
  return [...base, ...datasets.filter((dataset) => !seenNames.has(dataset.name))];
};

export interface UseAllSourcesParams {
  isOpen: boolean;
  preloadedSources?: ESQLSourceResult[];
  isTimeseries: boolean;
  getSources: () => Promise<ESQLSourceResult[]>;
  getTimeseriesIndices: () => Promise<{ indices: IndexAutocompleteItem[] }>;
  getDatasets?: () => Promise<EsqlDatasetsResult>;
}

export const useAllSources = ({
  isOpen,
  preloadedSources,
  isTimeseries,
  getSources,
  getTimeseriesIndices,
  getDatasets,
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

    const fetchDatasets = async (): Promise<ESQLSourceResult[]> => {
      if (isTimeseries || !getDatasets) return [];
      try {
        const result = await getDatasets();
        return normalizeDatasets(result);
      } catch (error) {
        // getDatasets already swallows fetch errors; this only guards against
        // normalizeDatasets failing on an unexpected response shape.
        // eslint-disable-next-line no-console
        console.error('Failed to normalize the datasets', error);
        return [];
      }
    };

    if (preloadedSources !== undefined) {
      // Render preloaded sources immediately, then append federated datasets when they
      // arrive, since preloaded sources come from the autocomplete cache and don't include them.
      setAllSources(preloadedSources);
      fetchDatasets().then((datasets) => {
        if (isMountedRef.current && isEffectActive) {
          setAllSources(mergeSources(preloadedSources, datasets));
        }
      });
      return () => {
        isEffectActive = false;
      };
    }

    const fetchSources = async () => {
      setIsLoading(true);
      try {
        if (isTimeseries) {
          const result = (await getTimeseriesIndices?.()) ?? { indices: [] };
          const normalized = normalizeTimeseriesIndices(result);
          if (isMountedRef.current && isEffectActive) setAllSources(normalized);
        } else {
          const [fetched, datasets] = await Promise.all([getSources?.() ?? [], fetchDatasets()]);
          if (isMountedRef.current && isEffectActive) {
            setAllSources(mergeSources(fetched, datasets));
          }
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
  }, [getSources, getTimeseriesIndices, getDatasets, isTimeseries, isOpen, preloadedSources]);

  return { allSources, isLoading };
};
