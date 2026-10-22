/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FilterableSource } from '@kbn/data-source';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type {
  PublishesDataViews,
  PublishesFilterableSources,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import {
  apiPublishesDataViews,
  apiPublishesFilterableSources,
  combineCompatibleChildrenApis,
} from '@kbn/presentation-publishing';
import { uniqBy } from 'lodash';
import { BehaviorSubject, combineLatest, switchMap } from 'rxjs';

export function initializeDataViewsManager(
  children$: PublishingSubject<{ [key: string]: DefaultEmbeddableApi }>
) {
  const dataViews$ = new BehaviorSubject<DataView[] | undefined>([]);

  const filterableSources$ = new BehaviorSubject<FilterableSource[] | undefined>([]);

  const subscription = combineLatest([
    combineCompatibleChildrenApis<PublishesDataViews, DataView[]>(
      { children$ },
      'dataViews$',
      apiPublishesDataViews,
      []
    ),
    combineCompatibleChildrenApis<PublishesFilterableSources, FilterableSource[]>(
      { children$ },
      'filterableSources$',
      apiPublishesFilterableSources,
      []
    ),
  ])
    .pipe(
      switchMap(async ([childDataViews, childSources]) => ({
        dataViews: uniqBy(childDataViews, 'id'),
        filterableSources: uniqBy<FilterableSource>([...childDataViews, ...childSources], 'id'),
      }))
    )
    .subscribe(({ dataViews, filterableSources }) => {
      dataViews$.next(dataViews);
      filterableSources$.next(filterableSources);
    });

  return {
    api: {
      dataViews$,
      filterableSources$,
    },
    cleanup: () => {
      subscription.unsubscribe();
    },
  };
}
