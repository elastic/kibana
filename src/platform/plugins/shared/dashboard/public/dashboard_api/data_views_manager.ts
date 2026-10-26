/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FilterableSource } from '@kbn/data-source';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { PublishesDataSources, PublishingSubject } from '@kbn/presentation-publishing';
import {
  apiPublishesDataSources,
  combineCompatibleChildrenApis,
} from '@kbn/presentation-publishing';
import { uniqBy } from 'lodash';
import { BehaviorSubject, switchMap } from 'rxjs';

export function initializeDataViewsManager(
  children$: PublishingSubject<{ [key: string]: DefaultEmbeddableApi }>
) {
  const dataSources$ = new BehaviorSubject<FilterableSource[] | undefined>([]);

  const dataSourcesSubscription = combineCompatibleChildrenApis<
    PublishesDataSources,
    FilterableSource[]
  >({ children$ }, 'dataSources$', apiPublishesDataSources, [])
    .pipe(
      switchMap(async (childDataSources) => {
        return uniqBy(childDataSources, 'id');
      })
    )
    .subscribe((nextDataSources) => {
      dataSources$.next(nextDataSources);
    });

  return {
    api: {
      dataSources$,
    },
    cleanup: () => {
      dataSourcesSubscription.unsubscribe();
    },
  };
}
