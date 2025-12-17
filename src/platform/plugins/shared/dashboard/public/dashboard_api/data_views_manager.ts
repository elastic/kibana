/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlGroupApi } from '@kbn/controls-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { combineCompatibleChildrenApis } from '@kbn/presentation-containers';
import type { PublishesDataViews, PublishingSubject } from '@kbn/presentation-publishing';
import { apiPublishesDataViews } from '@kbn/presentation-publishing';
import { uniqBy } from 'lodash';
import type { Observable } from 'rxjs';
import { BehaviorSubject, combineLatest, of, switchMap } from 'rxjs';

export function initializeDataViewsManager(
  controlGroupApi$: PublishingSubject<ControlGroupApi | undefined>,
  children$: PublishingSubject<{ [key: string]: DefaultEmbeddableApi }>
) {
  const dataViews$ = new BehaviorSubject<DataView[] | undefined>([]);

  const controlGroupDataViewsPipe: Observable<DataView[] | undefined> = controlGroupApi$.pipe(
    switchMap((controlGroupApi) => {
      return controlGroupApi ? controlGroupApi.dataViews$ : of([]);
    })
  );

  const childDataViewsPipe = combineCompatibleChildrenApis<PublishesDataViews, DataView[]>(
    { children$ },
    'dataViews$',
    apiPublishesDataViews,
    []
  );

  const dataViewsSubscription = combineLatest([controlGroupDataViewsPipe, childDataViewsPipe])
    .pipe(
      switchMap(async ([controlGroupDataViews, childDataViews]) => {
        const allDataViews = [...(controlGroupDataViews ?? []), ...childDataViews];
        return uniqBy(allDataViews, 'id');
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
