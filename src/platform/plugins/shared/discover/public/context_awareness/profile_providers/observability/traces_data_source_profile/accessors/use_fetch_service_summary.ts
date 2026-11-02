/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import type { ObservabilityTracesServiceSummaryData } from '@kbn/discover-shared-plugin/public';
import { useDiscoverServices } from '../../../../../hooks/use_discover_services';

export interface UseFetchServiceSummaryResult {
  loading: boolean;
  data: ObservabilityTracesServiceSummaryData | null;
}

/**
 * Fetches the service summary for the traces profile through the `discover_shared` features
 * registry — APM owns the data fetching, Discover stays decoupled from the APM internal routes.
 */
export const useFetchServiceSummary = ({
  serviceName,
  environment,
  enabled,
}: {
  serviceName: string;
  environment?: string;
  enabled: boolean;
}): UseFetchServiceSummaryResult => {
  const { discoverShared, data } = useDiscoverServices();
  const serviceSummaryFeature = discoverShared.features.registry.getById(
    'observability-traces-fetch-service-summary'
  );
  const { timefilter } = data.query.timefilter;

  const { loading, value } = useAbortableAsync(
    async ({ signal }) => {
      if (!enabled || !serviceSummaryFeature) {
        return null;
      }

      const { from, to } = timefilter.getAbsoluteTime();
      return serviceSummaryFeature.fetchServiceSummary(
        { serviceName, environment, start: from, end: to },
        signal
      );
    },
    [enabled, serviceSummaryFeature, serviceName, environment, timefilter]
  );

  return { loading, data: value ?? null };
};
