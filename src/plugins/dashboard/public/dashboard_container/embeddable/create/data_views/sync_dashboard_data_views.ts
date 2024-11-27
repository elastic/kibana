/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uniqBy } from 'lodash';
import { combineLatest, Observable, of, switchMap } from 'rxjs';

import { DataView } from '@kbn/data-views-plugin/common';
import { combineCompatibleChildrenApis } from '@kbn/presentation-containers';
import { apiPublishesDataViews, PublishesDataViews } from '@kbn/presentation-publishing';

import { dataService } from '../../../../services/kibana_services';
import { DashboardContainer } from '../../dashboard_container';

export function startSyncingDashboardDataViews(this: DashboardContainer) {
  const controlGroupDataViewsPipe: Observable<DataView[] | undefined> = this.controlGroupApi$.pipe(
    switchMap((controlGroupApi) => {
      return controlGroupApi ? controlGroupApi.dataViews : of([]);
    })
  );

  const childDataViewsPipe = combineCompatibleChildrenApis<PublishesDataViews, DataView[]>(
    this,
    'dataViews',
    apiPublishesDataViews,
    []
  );

  return combineLatest([controlGroupDataViewsPipe, childDataViewsPipe])
    .pipe(
      switchMap(([controlGroupDataViews, childDataViews]) => {
        const allDataViews = [
          ...(controlGroupDataViews ? controlGroupDataViews : []),
          ...childDataViews,
        ];
        if (allDataViews.length === 0) {
          return (async () => {
            const defaultDataViewId = await dataService.dataViews.getDefaultId();
            return [await dataService.dataViews.get(defaultDataViewId!)];
          })();
        }
        return of(uniqBy(allDataViews, 'id'));
      })
    )
    .subscribe((newDataViews) => {
      this.setAllDataViews(newDataViews);
    });
}
