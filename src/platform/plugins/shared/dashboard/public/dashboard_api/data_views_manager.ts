/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { PublishesDataViews, PublishingSubject } from '@kbn/presentation-publishing';
import { apiPublishesDataViews, combineCompatibleChildrenApis } from '@kbn/presentation-publishing';
import { uniqBy } from 'lodash';
import { BehaviorSubject, switchMap } from 'rxjs';

export function initializeDataViewsManager(
  children$: PublishingSubject<{ [key: string]: DefaultEmbeddableApi }>
) {
  const dataViews$ = new BehaviorSubject<DataView[] | undefined>([]);

  const dataViewsSubscription = combineCompatibleChildrenApis<PublishesDataViews, DataView[]>(
    { children$ },
    'dataViews$',
    apiPublishesDataViews,
    []
  )
    .pipe(
      switchMap(async (childDataViews) => {
        return uniqBy(childDataViews, 'id');
      })
    )
    .subscribe((nextDataViews) => {
      dataViews$.next(nextDataViews);
    });

  return {
    api: {
      dataViews$,
    },
    cleanup: () => {
      dataViewsSubscription.unsubscribe();
    },
  };
}
