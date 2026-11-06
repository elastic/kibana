/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import type { SearchTriggerEventLogHit, SearchTriggerEventLogResult } from '@kbn/workflows-ui';

function haveSameTriggerEventHitIds(
  previousHits: SearchTriggerEventLogHit[],
  nextHits: SearchTriggerEventLogHit[]
): boolean {
  if (previousHits.length !== nextHits.length) {
    return false;
  }
  for (let index = 0; index < previousHits.length; index += 1) {
    if (previousHits[index].id !== nextHits[index].id) {
      return false;
    }
  }
  return true;
}

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
      setAccumulatedHits((previousHits) =>
        haveSameTriggerEventHitIds(previousHits, searchResult.hits)
          ? previousHits
          : searchResult.hits
      );
      return;
    }
    setAccumulatedHits((prev) => {
      const seen = new Set(prev.map((h) => h.id));
      const appended = searchResult.hits.filter((h) => !seen.has(h.id));
      return appended.length === 0 ? prev : prev.concat(appended);
    });
  }, [searchResult, pageIndex, isPreviousData]);

  return [accumulatedHits, setAccumulatedHits] as const;
}
