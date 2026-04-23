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
  apiCanBeSelectedToIndicateRelated,
  apiCanIndicateRelatedPanels,
  apiHasParentApi,
  apiHasUniqueId,
  apiPublishesViewMode,
} from '@kbn/presentation-publishing';
import type { Subscription } from 'rxjs';
import { combineLatest, distinctUntilChanged, map, debounceTime } from 'rxjs';

export const useIndicateRelatedPanelsSelector = (
  api: unknown,
  skipDebounce?: boolean // For faster testing
) => {
  const parentApi = api && apiHasParentApi(api) ? api.parentApi : null;
  const parentApiLoaded =
    parentApi && apiCanIndicateRelatedPanels(parentApi) && apiPublishesViewMode(parentApi)
      ? parentApi
      : null;

  const id = useMemo(() => (api && apiHasUniqueId(api) ? api.uuid : undefined), [api]);

  const [viewMode, setViewMode] = useState<string>(parentApiLoaded?.viewMode$.value ?? 'view');
  const [indicateRelatedPanelsId, setIndicateRelatedPanelsId] = useState<string | undefined>(
    parentApiLoaded?.indicateRelatedPanelsId$.value
  );
  const parentApiSubscription = useRef<Subscription | undefined>();
  const [numberOfRelatedPanels, setNumberOfRelatedPanels] = useState<number | undefined>();

  useEffect(() => {
    // Don't trigger expensive subscriptions if the API can't indicate related panels
    if (!parentApiLoaded || !apiCanBeSelectedToIndicateRelated(api)) return;
    if (!parentApiSubscription.current) {
      const numberOfRelatedPanels$ = parentApiLoaded.getRelatedPanelIds$
        .byESQLVariable(id ?? '')
        .pipe(
          debounceTime(skipDebounce ? 0 : 250), // Prevent a flash of 0 related panels on initial load
          distinctUntilChanged(),
          map((relatedPanelIds) => relatedPanelIds.length)
        );
      const sub = combineLatest([
        parentApiLoaded.viewMode$,
        parentApiLoaded.indicateRelatedPanelsId$,
        numberOfRelatedPanels$,
      ]).subscribe(([vm, indicateId, numberRelated]) => {
        setViewMode(vm);
        setIndicateRelatedPanelsId(indicateId);
        setNumberOfRelatedPanels(numberRelated);
      });
      parentApiSubscription.current = sub;
    }
    return () => parentApiSubscription.current?.unsubscribe();
  }, [parentApiLoaded, id, api, skipDebounce]);

  const canIndicateRelatedPanels = useMemo(
    () =>
      Boolean(
        viewMode === 'edit' &&
          api &&
          id &&
          apiCanBeSelectedToIndicateRelated(api) &&
          api.canBeRelatedPanelsIndicator
      ),
    [api, viewMode, id]
  );
  const isIndicatingRelatedPanels = useMemo(
    () => canIndicateRelatedPanels && indicateRelatedPanelsId === id,
    [indicateRelatedPanelsId, canIndicateRelatedPanels, id]
  );
  const onToggleIndicateRelatedPanels = useCallback(() => {
    if (canIndicateRelatedPanels && apiCanIndicateRelatedPanels(parentApi))
      parentApi.setIndicateRelatedPanelsId(isIndicatingRelatedPanels ? undefined : id);
  }, [id, parentApi, canIndicateRelatedPanels, isIndicatingRelatedPanels]);

  return {
    canIndicateRelatedPanels,
    isIndicatingRelatedPanels,
    onToggleIndicateRelatedPanels,
    numberOfRelatedPanels,
  };
};
