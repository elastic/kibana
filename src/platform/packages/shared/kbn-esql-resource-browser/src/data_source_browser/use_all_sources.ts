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
  EsqlViewsResult,
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

const normalizeViews = ({ views }: EsqlViewsResult): ESQLSourceResult[] =>
  views?.map((view) => ({
    name: view.name,
    title: view.name,
    type: view.type ?? SOURCES_TYPES.VIEW,
    hidden: false,
  })) ?? [];

const mergeSources = (
  base: ESQLSourceResult[],
  ...additional: ESQLSourceResult[][]
): ESQLSourceResult[] => {
  const seenNames = new Set(base.map((source) => source.name));
  const merged = [...base];

  for (const source of additional.flat()) {
    if (seenNames.has(source.name)) continue;
    seenNames.add(source.name);
    merged.push(source);
  }

  return merged;
};

export interface UseAllSourcesParams {
  isOpen: boolean;
  preloadedSources?: ESQLSourceResult[];
  isTimeseries: boolean;
  getSources: () => Promise<ESQLSourceResult[]>;
  getTimeseriesIndices: () => Promise<{ indices: IndexAutocompleteItem[] }>;
  getDatasets?: () => Promise<EsqlDatasetsResult>;
  getViews?: () => Promise<EsqlViewsResult>;
}

export const useAllSources = ({
  isOpen,
  preloadedSources,
  isTimeseries,
  getSources,
  getTimeseriesIndices,
  getDatasets,
  getViews,
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

    const fetchViews = async (): Promise<ESQLSourceResult[]> => {
      if (isTimeseries || !getViews) return [];
      try {
        return normalizeViews(await getViews());
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch the ES|QL views', error);
        return [];
      }
    };

    // Merges datasets and views in once they arrive, rather than holding back the base sources.
    const appendOptionalSources = async (base: ESQLSourceResult[]) => {
      const [datasets, views] = await Promise.all([fetchDatasets(), fetchViews()]);
      if (isMountedRef.current && isEffectActive) {
        setAllSources(mergeSources(base, datasets, views));
      }
    };

    if (preloadedSources !== undefined) {
      // Render preloaded sources immediately, then append federated datasets and views when they
      // arrive, since preloaded sources come from the autocomplete cache and don't include them.
      setAllSources(preloadedSources);
      appendOptionalSources(preloadedSources);
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
          const fetched = (await getSources?.()) ?? [];
          if (isMountedRef.current && isEffectActive) {
            setAllSources(fetched);
            // With nothing to show yet, stay in the loading state until the optional sources
            // land, so the empty message is not rendered over a list that is still filling.
            if (fetched.length === 0) {
              await appendOptionalSources(fetched);
            } else {
              appendOptionalSources(fetched);
            }
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
  }, [
    getSources,
    getTimeseriesIndices,
    getDatasets,
    getViews,
    isTimeseries,
    isOpen,
    preloadedSources,
  ]);

  return { allSources, isLoading };
};
