/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useState } from 'react';
import { loadQueryProfileHeat, setQueryProfileHeat } from '@kbn/data-plugin/public';
import type { ISearchStart } from '@kbn/data-plugin/public';
import type { RequestAdapter } from '@kbn/inspector-plugin/common';
import { RequestStatus } from '@kbn/inspector-plugin/common';

interface UseQueryProfileModeParams {
  isOn: boolean;
  requests: RequestAdapter;
  search: Pick<ISearchStart, 'esql'>;
  /** Replaceable so the hook can be tested without running a query. */
  loadHeat?: typeof loadQueryProfileHeat;
  setHeat?: typeof setQueryProfileHeat;
}

export type QueryProfileModeStatus = 'idle' | 'profiling' | 'error';

/**
 * While on, profiles each ES|QL request that completes, by running it again with profiling in the
 * background, and shares where the query spent its time so the editor can show it. The original
 * request is untouched, and turning the mode off removes what was shown.
 */
export function useQueryProfileMode({
  isOn,
  requests,
  search,
  loadHeat = loadQueryProfileHeat,
  setHeat = setQueryProfileHeat,
}: UseQueryProfileModeParams): QueryProfileModeStatus {
  const lastProfiledId = useRef<string | undefined>(undefined);
  const [status, setStatus] = useState<QueryProfileModeStatus>('idle');

  useEffect(() => {
    if (!isOn) {
      lastProfiledId.current = undefined;
      return;
    }

    let controller: AbortController | undefined;

    const profileLatest = () => {
      const request = requests.getRequests().at(-1);
      const requestJson = request?.json;
      if (
        !request ||
        request.status !== RequestStatus.OK ||
        request.id === lastProfiledId.current ||
        !requestJson ||
        typeof requestJson !== 'object' ||
        !('query' in requestJson) ||
        typeof requestJson.query !== 'string'
      ) {
        return;
      }

      lastProfiledId.current = request.id;
      controller?.abort();
      const current = new AbortController();
      controller = current;

      setStatus('profiling');
      loadHeat({ search, requestJson, abortSignal: current.signal })
        .then((heat) => {
          if (!current.signal.aborted) {
            setHeat(heat);
            setStatus('idle');
          }
        })
        .catch(() => {
          // The profile is a convenience, so a failure does not touch the run. It is only reported.
          if (!current.signal.aborted) {
            setStatus('error');
          }
        });
    };

    profileLatest();
    requests.on('change', profileLatest);

    return () => {
      requests.off('change', profileLatest);
      controller?.abort();
      setHeat(undefined);
      setStatus('idle');
    };
  }, [isOn, requests, search, loadHeat, setHeat]);

  return isOn ? status : 'idle';
}
