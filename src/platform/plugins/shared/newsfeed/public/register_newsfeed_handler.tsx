/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { shareReplay, tap, map } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import type { FetchResult } from './types';
import type { NewsfeedApi } from './lib/api';
import { openNewsfeedSidebar } from './sidebar/open';

export const registerNewsfeedHandler = ({
  core,
  api,
  isServerless,
}: {
  core: CoreStart;
  api: NewsfeedApi;
  isServerless: boolean;
}) => {
  let lastFetchResult: FetchResult | null | void = null;
  const handlerResults$ = api.fetchResults$.pipe(
    tap((result) => {
      lastFetchResult = result;
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  const handlerApi: NewsfeedApi = { ...api, fetchResults$: handlerResults$ };

  return core.chrome.next.registerNewsfeedHandler({
    open: () => {
      openNewsfeedSidebar(core.chrome.sidebar, handlerApi, lastFetchResult);
    },
    hasNew$: handlerResults$.pipe(map((result) => result?.hasNew ?? false)),
  });
};
