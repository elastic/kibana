/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import type { EntitySummaryDefinition, EntitySummaryEntity } from './types';

export interface UseFetchEntitySummaryResult<RawData> {
  loading: boolean;
  data: RawData | null;
}

/**
 * Fetches an entity summary through the `discover_shared` features registry — the fulfilling plugin
 * (e.g. APM for services) owns the data, Discover stays decoupled from its internal routes. The
 * definition decides which feature to call and how to shape the request.
 */
export const useFetchEntitySummary = <RawData>({
  definition,
  entity,
  enabled,
}: {
  definition: EntitySummaryDefinition<RawData>;
  entity: EntitySummaryEntity | undefined;
  enabled: boolean;
}): UseFetchEntitySummaryResult<RawData> => {
  const { discoverShared, data } = useDiscoverServices();
  const { registry } = discoverShared.features;
  const { timefilter } = data.query.timefilter;

  // Wrap the result in an object so the hook's generic stays a single (non-union) type: handing
  // `RawData | null` directly would make `AbortableAsyncState`'s conditional distribute and widen
  // the resolved `value` to `{}`.
  const { loading, value } = useAbortableAsync(
    async ({ signal }): Promise<{ data: RawData | null }> => {
      if (!enabled || !entity) {
        return { data: null };
      }

      const { from, to } = timefilter.getAbsoluteTime();
      const fetched = await definition.fetch({
        registry,
        entity,
        timeRange: { start: from, end: to },
        signal,
      });
      return { data: fetched };
    },
    [enabled, entity, definition, registry, timefilter]
  );

  return { loading, data: value?.data ?? null };
};
