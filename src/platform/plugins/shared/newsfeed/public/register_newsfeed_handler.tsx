/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { shareReplay, map, tap } from 'rxjs';
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { FetchResult } from './types';
import { NewsfeedContainer } from './components/flyout_list';
import type { NewsfeedApi } from './lib/api';

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

  return core.chrome.registerNewsfeedHandler({
    open: () => {
      if (lastFetchResult) {
        handlerApi.markAsRead(lastFetchResult.feedItems.map((item) => item.hash));
      }
      const flyoutRef = core.overlays.openSystemFlyout(
        <NewsfeedContainer
          newsfeedApi={handlerApi}
          onClose={() => flyoutRef.close()}
          showPlainSpinner={false}
          isServerless={isServerless}
        />,
        {
          size: 's',
        }
      );
    },
    hasNew$: handlerResults$.pipe(map((result) => result?.hasNew ?? false)),
  });
};
