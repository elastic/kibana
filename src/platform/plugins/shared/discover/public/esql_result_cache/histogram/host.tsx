/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useLayoutEffect, useSyncExternalStore } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { RequestStatus } from '@kbn/inspector-plugin/common';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { InPortal, OutPortal } from 'react-reverse-portal';
import {
  UnifiedHistogramChart,
  useUnifiedHistogram,
  type UnifiedHistogramChartLoadEvent,
} from '@kbn/unified-histogram';
import type { CachedHistogramHostEntry, EsqlHistogramCache } from './cache';

const CachedHistogramEntry = ({
  entry,
  service,
}: {
  entry: CachedHistogramHostEntry;
  service: EsqlHistogramCache;
}) => {
  const unifiedHistogram = useUnifiedHistogram(entry.props);
  const renderToggleActions = useCallback(
    () => <OutPortal node={entry.routeActionsPortalNode} />,
    [entry.routeActionsPortalNode]
  );
  const onChartLoad = useCallback(
    (event: UnifiedHistogramChartLoadEvent) => {
      unifiedHistogram.chartProps?.onChartLoad?.(event);
      const request = event.adapters.requests?.getRequests()[0];
      if (request?.status === RequestStatus.OK) {
        service.markLoaded(entry);
      }
    },
    [entry, service, unifiedHistogram.chartProps]
  );

  useLayoutEffect(() => {
    service.updateHostOutput({
      api: unifiedHistogram.api,
      generation: entry.generation,
      layoutProps: unifiedHistogram.layoutProps,
      tabId: entry.tabId,
    });
  }, [entry.generation, entry.tabId, service, unifiedHistogram.api, unifiedHistogram.layoutProps]);

  if (!unifiedHistogram.isInitialized) {
    return null;
  }

  return (
    <UnifiedHistogramChart
      {...unifiedHistogram.chartProps}
      onChartLoad={onChartLoad}
      renderToggleActions={renderToggleActions}
    />
  );
};

const EsqlHistogramCacheHost = ({
  service,
}: {
  service: EsqlHistogramCache;
}) => {
  const { entries } = useSyncExternalStore(service.subscribe, service.getState, service.getState);

  return (
    <>
      {entries.map((entry) => (
        <InPortal key={entry.instanceId} node={entry.portalNode}>
          <CachedHistogramEntry entry={entry} service={service} />
        </InPortal>
      ))}
    </>
  );
};

export const mountEsqlHistogramCacheHost = (
  core: CoreStart,
  service: EsqlHistogramCache
) => {
  const hostElement = document.createElement('div');
  return toMountPoint(<EsqlHistogramCacheHost service={service} />, core)(hostElement);
};
