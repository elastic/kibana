/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import {
  apiCanIndicateRelatedChildren,
  apiCanIndicateRelatedSiblings,
  apiHasParentApi,
  apiHasUniqueId,
  apiPublishesViewMode,
} from '@kbn/presentation-publishing';
import type { Subscription } from 'rxjs';
import { combineLatest } from 'rxjs';

export const useIndicateRelatedPanelsSelector = (api: unknown) => {
  const parentApi = api && apiHasParentApi(api) ? api.parentApi : null;
  const parentApiLoaded =
    parentApi && apiCanIndicateRelatedChildren(parentApi) && apiPublishesViewMode(parentApi)
      ? parentApi
      : null;

  const id = useMemo(() => (api && apiHasUniqueId(api) ? api.uuid : undefined), [api]);

  const [viewMode, setViewMode] = useState<string>(parentApiLoaded?.viewMode$.value ?? 'view');
  const [relatedPanelsIndicatorId, setRelatedPanelsIndicatorId] = useState<string | undefined>(
    parentApiLoaded?.relatedPanelsIndicatorId$.value
  );
  const [relatedPanels, setRelatedPanels] = useState<string[]>([]);

  const parentApiSubscription = useRef<Subscription | undefined>();

  useEffect(() => {
    // Don't trigger expensive subscriptions if the API can't indicate related panels
    if (!parentApiLoaded || !apiCanIndicateRelatedSiblings(api)) return;
    if (!parentApiSubscription.current) {
      const sub = combineLatest([
        parentApiLoaded.viewMode$,
        parentApiLoaded.relatedPanelsIndicatorId$,
        api.relatedPanels$,
      ]).subscribe(([vm, indicateId, relatedPanelIds]) => {
        setViewMode(vm);
        setRelatedPanelsIndicatorId(indicateId);
        setRelatedPanels(relatedPanelIds);
      });
      parentApiSubscription.current = sub;
    }
    return () => parentApiSubscription.current?.unsubscribe();
  }, [parentApiLoaded, id, api]);

  const canIndicateRelatedPanels = useMemo(
    () => Boolean(viewMode === 'edit' && id && apiCanIndicateRelatedSiblings(api)),
    [api, viewMode, id]
  );
  const numberOfRelatedPanels = useMemo(() => relatedPanels.length, [relatedPanels]);
  const isIndicatingRelatedPanels = useMemo(
    () => canIndicateRelatedPanels && relatedPanelsIndicatorId === id,
    [canIndicateRelatedPanels, relatedPanelsIndicatorId, id]
  );
  const onToggleIndicateRelatedPanels = useCallback(() => {
    if (apiCanIndicateRelatedChildren(parentApi))
      parentApi.setRelatedPanelsIndicatorId(isIndicatingRelatedPanels ? undefined : id);
  }, [parentApi, isIndicatingRelatedPanels, id]);

  return {
    canIndicateRelatedPanels,
    isIndicatingRelatedPanels,
    onToggleIndicateRelatedPanels,
    numberOfRelatedPanels,
  };
};
