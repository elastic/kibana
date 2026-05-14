/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { SearchTriggerEventLogHit, SearchTriggerEventLogResult } from '@kbn/workflows-ui';

export function useAccumulatedTriggerEventSearchPages(
  searchResult: SearchTriggerEventLogResult | undefined,
  pageIndex: number,
  isPreviousData: boolean
): readonly [SearchTriggerEventLogHit[], Dispatch<SetStateAction<SearchTriggerEventLogHit[]>>] {
  const [accumulatedHits, setAccumulatedHits] = useState<SearchTriggerEventLogHit[]>([]);

  useEffect(() => {
    if (!searchResult?.hits || isPreviousData) {
      return;
    }
    const apiPage = searchResult.page ?? 1;
    if (apiPage !== pageIndex + 1) {
      return;
    }
    if (pageIndex === 0) {
      setAccumulatedHits(searchResult.hits);
      return;
    }
    setAccumulatedHits((prev) => {
      const seen = new Set(prev.map((h) => h.id));
      const appended = searchResult.hits.filter((h) => !seen.has(h.id));
      return appended.length === 0 ? prev : [...prev, ...appended];
    });
  }, [searchResult, pageIndex, isPreviousData]);

  return [accumulatedHits, setAccumulatedHits] as const;
}

export function useTriggerEventGridScrollLoadMore(options: {
  dataViewReady: boolean;
  queryEnabled: boolean;
  surfaceRef: RefObject<HTMLDivElement | null>;
  isFetching: boolean;
  hasMoreHits: boolean;
  reboundKey: string;
  onNearBottom: () => void;
}): void {
  const {
    dataViewReady,
    queryEnabled,
    surfaceRef,
    isFetching,
    hasMoreHits,
    reboundKey,
    onNearBottom,
  } = options;

  const scrollStateRef = useRef({ isFetching, hasMoreHits });
  scrollStateRef.current = { isFetching, hasMoreHits };

  const onNearBottomRef = useRef(onNearBottom);
  onNearBottomRef.current = onNearBottom;

  useEffect(() => {
    if (!dataViewReady || !queryEnabled) {
      return;
    }
    const surface = surfaceRef.current;
    if (!surface) {
      return;
    }

    let cancelled = false;
    let detachScroll: (() => void) | undefined;
    let rafAttempts = 0;
    const maxRafAttempts = 240;

    const tryAttach = () => {
      if (cancelled) {
        return;
      }
      const gridScroll = surface.querySelector<HTMLElement>('.euiDataGrid__virtualized');
      if (!gridScroll) {
        rafAttempts += 1;
        if (rafAttempts <= maxRafAttempts) {
          requestAnimationFrame(tryAttach);
        }
        return;
      }
      let lastBump = 0;
      const onScroll = () => {
        const { isFetching: fetching, hasMoreHits: more } = scrollStateRef.current;
        if (!more || fetching) {
          return;
        }
        if (gridScroll.scrollHeight - gridScroll.scrollTop - gridScroll.clientHeight > 120) {
          return;
        }
        const now = Date.now();
        if (now - lastBump < 400) {
          return;
        }
        lastBump = now;
        onNearBottomRef.current();
      };
      gridScroll.addEventListener('scroll', onScroll, { passive: true });
      detachScroll = () => gridScroll.removeEventListener('scroll', onScroll);
    };

    tryAttach();
    return () => {
      cancelled = true;
      detachScroll?.();
    };
  }, [dataViewReady, queryEnabled, surfaceRef, reboundKey]);
}
