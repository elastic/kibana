/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import type { SpanLinks } from '@kbn/apm-types';
import type { ProcessorEvent } from '@kbn/apm-types-shared';
import { getUnifiedDocViewerServices } from '../../../../../plugin';

const INITIAL_VALUE: SpanLinks = {
  incomingSpanLinks: [],
  outgoingSpanLinks: [],
};

export function useFetchSpanLinks({
  docId,
  traceId,
  processorEvent,
}: {
  docId: string;
  traceId: string;
  processorEvent?: ProcessorEvent;
}) {
  const { discoverShared, data } = getUnifiedDocViewerServices();
  const timeFilter = data.query.timefilter.timefilter.getAbsoluteTime();

  const fetchSpanLinks = discoverShared.features.registry.getById(
    'observability-traces-fetch-span-links'
  );

  const { loading, error, value } = useAbortableAsync(
    async ({ signal }) => {
      if (!fetchSpanLinks) {
        return null;
      }

      return fetchSpanLinks.fetchSpanLinks(
        { docId, traceId, start: timeFilter.from, end: timeFilter.to, processorEvent },
        signal
      );
    },
    [fetchSpanLinks]
  );

  return { loading, error, value: value || INITIAL_VALUE };
}
