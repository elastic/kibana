/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uniqBy } from 'lodash';
import { BehaviorSubject, combineLatest, Observable, of, switchMap } from 'rxjs';

import { DataView } from '@kbn/data-views-plugin/common';
import { combineCompatibleChildrenApis } from '@kbn/presentation-containers';
import {
  apiPublishesDataViews,
  PublishesDataViews,
  PublishingSubject,
} from '@kbn/presentation-publishing';

import { ControlGroupApi } from '@kbn/controls-plugin/public';
import { dataService } from '../services/kibana_services';

export function initializeDataViewsManager(
  controlGroupApi$: PublishingSubject<ControlGroupApi | undefined>,
  children$: PublishingSubject<{ [key: string]: unknown }>
) {
  const dataViews = new BehaviorSubject<DataView[] | undefined>([]);

  const controlGroupDataViewsPipe: Observable<DataView[] | undefined> = controlGroupApi$.pipe(
    switchMap((controlGroupApi) => {
      return controlGroupApi ? controlGroupApi.dataViews : of([]);
    })
  );

  const childDataViewsPipe = combineCompatibleChildrenApis<PublishesDataViews, DataView[]>(
    { children$ },
    'dataViews',
    apiPublishesDataViews,
    []
  );

  const dataViewsSubscription = combineLatest([controlGroupDataViewsPipe, childDataViewsPipe])
    .pipe(
      switchMap(async ([controlGroupDataViews, childDataViews]) => {
        const allDataViews = [...(controlGroupDataViews ?? []), ...childDataViews];
        if (allDataViews.length === 0) {
          try {
            const defaultDataView = await dataService.dataViews.getDefaultDataView();
            if (defaultDataView) {
              allDataViews.push(defaultDataView);
            }
          } catch (error) {
            // ignore error getting default data view
          }
        }
        return uniqBy(allDataViews, 'id');
      })
    )
    .subscribe((newDataViews) => {
      dataViews.next(newDataViews);
    });

  return {
    api: {
      dataViews,
    },
    cleanup: () => {
      dataViewsSubscription.unsubscribe();
    },
  };
}
