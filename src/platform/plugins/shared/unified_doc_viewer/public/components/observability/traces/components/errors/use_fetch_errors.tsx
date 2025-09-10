/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1".
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import type { ErrorGroupMainStatisticsResponse } from '@kbn/apm-types';
import { getUnifiedDocViewerServices } from '../../../../../plugin';

const INITIAL_VALUE: ErrorGroupMainStatisticsResponse = {
  errorGroups: [],
  maxCountExceeded: false,
};

export function useFetchErrors({
  traceId,
  transactionId,
  spanId,
  serviceName,
}: {
  traceId: string;
  transactionId?: string;
  spanId?: string;
  serviceName?: string;
}) {
  const { discoverShared, data } = getUnifiedDocViewerServices();
  const timeFilter = data.query.timefilter.timefilter.getAbsoluteTime();

  const fetchErrors = discoverShared.features.registry.getById('observability-traces-fetch-errors');

  const { loading, error, value } = useAbortableAsync(
    async ({ signal }) => {
      if (!fetchErrors) {
        return null;
      }

      return fetchErrors.fetchErrors(
        {
          traceId,
          serviceName,
          start: timeFilter.from,
          end: timeFilter.to,
        },
        signal
      );
    },
    [fetchErrors, traceId, serviceName, timeFilter.from, timeFilter.to, transactionId, spanId]
  );

  return { loading, error, response: value || INITIAL_VALUE };
}
