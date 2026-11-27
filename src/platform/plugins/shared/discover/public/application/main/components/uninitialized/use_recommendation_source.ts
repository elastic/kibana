/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import { DATASETS_ROUTE, type EsqlDatasetsResult } from '@kbn/esql-types';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { getRecommendationSource } from './get_recommendation_source';

/**
 * Resolves whether recommended queries can use a local index. A project with
 * only ES|QL datasets is federated-only, and the first dataset is named for the callout.
 */
export const useRecommendationSource = (
  currentTitle: string | undefined
): { source: string | undefined; isResolved: boolean; isFederatedOnly: boolean } => {
  const { dataViews, http } = useDiscoverServices();
  const [state, setState] = useState<{
    source: string | undefined;
    isResolved: boolean;
    isFederatedOnly: boolean;
  }>({
    source: currentTitle,
    isResolved: false,
    isFederatedOnly: false,
  });

  useEffect(() => {
    const abortController = new AbortController();
    let cancelled = false;

    const resolve = async () => {
      const hasLocalESData = await dataViews.hasData.hasESData().catch(() => false);
      const datasetNames = hasLocalESData
        ? []
        : await http
            .get<EsqlDatasetsResult>(DATASETS_ROUTE, { signal: abortController.signal })
            .then((result) => result?.datasets?.map((dataset) => dataset.name) ?? [])
            .catch(() => []);

      if (cancelled) return;
      setState({
        source: getRecommendationSource({ currentTitle, hasLocalESData, datasetNames }),
        isResolved: true,
        isFederatedOnly: !hasLocalESData && datasetNames.length > 0,
      });
    };

    void resolve();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [currentTitle, dataViews.hasData, http]);

  return state;
};
